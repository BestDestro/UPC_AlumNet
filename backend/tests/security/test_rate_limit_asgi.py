#!/usr/bin/env python3
"""Pruebas unitarias de la capa 3 (backend/app/core/rate_limit.py).

Solo usa la biblioteca estandar: se puede ejecutar en el host sin instalar nada.
    python3 backend/tests/security/test_rate_limit_asgi.py
No hace peticiones de red ni toca la base de datos: usa una app ASGI falsa.
"""
import asyncio
import json
import sys
import unittest
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(BACKEND))

from app.core.rate_limit import RateLimitConfig, RateLimitMiddleware  # noqa: E402

FORM = [(b"content-type", b"application/x-www-form-urlencoded")]
JSON = [(b"content-type", b"application/json")]


class Clock:
    def __init__(self):
        self.t = 1000.0

    def __call__(self):
        return self.t

    def advance(self, seconds):
        self.t += seconds


class Downstream:
    """App ASGI falsa: devuelve el estado configurado y guarda el cuerpo que recibe."""

    def __init__(self, status=401):
        self.status = status
        self.calls = 0
        self.last_body = None

    async def __call__(self, scope, receive, send):
        self.calls += 1
        chunks = []
        while True:
            message = await receive()
            chunks.append(message.get("body", b""))
            if not message.get("more_body", False):
                break
        self.last_body = b"".join(chunks)
        await send({"type": "http.response.start", "status": self.status, "headers": []})
        await send({"type": "http.response.body", "body": b"{}"})


def build(status=401, **overrides):
    clock = Clock()
    app = Downstream(status)
    cfg = RateLimitConfig(trusted_proxies=("10.0.0.5",), **overrides)
    mw = RateLimitMiddleware(app, cfg, clock=clock, resolver=lambda host: [])
    return mw, app, clock


def request(mw, path, body=b"", headers=FORM, method="POST", peer=("1.2.3.4", 5555), extra=()):
    sent = []
    scope = {"type": "http", "method": method, "path": path,
             "headers": list(headers) + list(extra), "client": peer}
    queue = [{"type": "http.request", "body": body, "more_body": False}]

    async def receive():
        return queue.pop(0) if queue else {"type": "http.disconnect"}

    async def send(message):
        sent.append(message)

    asyncio.run(mw(scope, receive, send))
    start = next(m for m in sent if m["type"] == "http.response.start")
    return start["status"], dict(start["headers"])


LOGIN = "/api/v1/auth/login"
REGISTER = "/api/v1/auth/register"


def login(mw, user="alice@upc.edu", **kw):
    return request(mw, LOGIN, f"username={user}&password=x".encode(), **kw)


class RateLimitTests(unittest.TestCase):
    def test_ip_limit_then_429_with_retry_after(self):
        mw, app, _ = build(login_limit=3, account_lock_enabled=False)
        codes = [login(mw)[0] for _ in range(5)]
        self.assertEqual(codes, [401, 401, 401, 429, 429])
        status, headers = login(mw)
        self.assertEqual(status, 429)
        self.assertGreaterEqual(int(headers[b"retry-after"]), 1)
        self.assertEqual(app.calls, 3, "las peticiones rechazadas no deben llegar a la app")

    def test_window_expires(self):
        mw, _, clock = build(login_limit=2, login_window=60, account_lock_enabled=False)
        self.assertEqual([login(mw)[0] for _ in range(3)], [401, 401, 429])
        clock.advance(61)
        self.assertEqual(login(mw)[0], 401)

    def test_other_ip_has_its_own_bucket(self):
        mw, _, _ = build(login_limit=1, account_lock_enabled=False)
        self.assertEqual(login(mw, peer=("1.1.1.1", 1))[0], 401)
        self.assertEqual(login(mw, peer=("1.1.1.1", 1))[0], 429)
        self.assertEqual(login(mw, peer=("2.2.2.2", 1))[0], 401)

    def test_unprotected_routes_and_methods_pass(self):
        mw, app, _ = build(login_limit=1)
        for _ in range(5):
            self.assertEqual(request(mw, "/api/v1/offers/", method="GET")[0], 401)
            self.assertEqual(request(mw, "/health", method="GET")[0], 401)
            self.assertEqual(request(mw, LOGIN, method="GET")[0], 401)
        self.assertEqual(app.calls, 15)

    def test_register_has_separate_limit(self):
        mw, _, _ = build(register_limit=2, login_limit=100)
        body = b'{"email":"x@gmail.com"}'
        codes = [request(mw, REGISTER, body, headers=JSON)[0] for _ in range(3)]
        self.assertEqual(codes, [401, 401, 429])
        self.assertEqual(login(mw)[0], 401, "el limite de registro no afecta al login")

    def test_spoofed_x_real_ip_is_ignored_for_untrusted_peer(self):
        mw, _, _ = build(login_limit=2, account_lock_enabled=False)
        codes = [login(mw, extra=[(b"x-real-ip", f"9.9.9.{i}".encode())])[0] for i in range(4)]
        self.assertEqual(codes, [401, 401, 429, 429])

    def test_x_real_ip_is_used_when_peer_is_trusted_proxy(self):
        mw, _, _ = build(login_limit=1, account_lock_enabled=False)
        nginx = ("10.0.0.5", 4000)
        self.assertEqual(login(mw, peer=nginx, extra=[(b"x-real-ip", b"7.7.7.7")])[0], 401)
        self.assertEqual(login(mw, peer=nginx, extra=[(b"x-real-ip", b"7.7.7.7")])[0], 429)
        self.assertEqual(login(mw, peer=nginx, extra=[(b"x-real-ip", b"8.8.8.8")])[0], 401)

    def test_invalid_x_real_ip_from_trusted_proxy_falls_back_to_peer(self):
        mw, _, _ = build(login_limit=1, account_lock_enabled=False)
        nginx = ("10.0.0.5", 4000)
        self.assertEqual(login(mw, peer=nginx, extra=[(b"x-real-ip", b"no-es-una-ip")])[0], 401)
        self.assertEqual(login(mw, peer=nginx, extra=[(b"x-real-ip", b"tampoco")])[0], 429)

    def test_account_lock_across_different_ips(self):
        mw, app, _ = build(login_limit=100, account_max_failures=3)
        codes = [login(mw, peer=(f"5.5.5.{i}", 1))[0] for i in range(5)]
        self.assertEqual(codes, [401, 401, 401, 429, 429])
        self.assertEqual(app.calls, 3)
        self.assertEqual(login(mw, user="bob@upc.edu", peer=("5.5.5.9", 1))[0], 401,
                         "otra cuenta no debe verse afectada")

    def test_account_lock_is_case_insensitive_and_expires(self):
        mw, _, clock = build(login_limit=100, account_max_failures=2, account_window=900)
        self.assertEqual(login(mw, user="Alice@UPC.edu")[0], 401)
        self.assertEqual(login(mw, user="alice@upc.edu")[0], 401)
        self.assertEqual(login(mw, user="ALICE@upc.edu")[0], 429)
        clock.advance(901)
        self.assertEqual(login(mw, user="alice@upc.edu")[0], 401)

    def test_successful_login_resets_failures(self):
        mw, app, _ = build(login_limit=100, account_max_failures=3)
        login(mw)
        login(mw)
        app.status = 200
        self.assertEqual(login(mw)[0], 200)
        app.status = 401
        self.assertEqual([login(mw)[0] for _ in range(3)], [401, 401, 401])
        self.assertEqual(login(mw)[0], 429)

    def test_non_401_statuses_do_not_count_as_failures(self):
        mw, app, _ = build(status=403, login_limit=100, account_max_failures=2)
        self.assertEqual([login(mw)[0] for _ in range(6)], [403] * 6)

    def test_json_body_account_lock_for_mfa_login(self):
        mw, _, _ = build(login_limit=100, account_max_failures=2)
        body = json.dumps({"email": "carol@upc.edu", "password": "x", "code": "000000"}).encode()
        path = "/api/v1/auth/mfa/login"
        codes = [request(mw, path, body, headers=JSON)[0] for _ in range(3)]
        self.assertEqual(codes, [401, 401, 429])

    def test_body_is_replayed_intact_to_the_app(self):
        mw, app, _ = build(login_limit=100)
        body = b"username=alice@upc.edu&password=Pa%24%24w0rd"
        login_status, _ = request(mw, LOGIN, body)
        self.assertEqual(login_status, 401)
        self.assertEqual(app.last_body, body)

    def test_malformed_and_oversized_bodies_do_not_crash(self):
        mw, app, _ = build(login_limit=100, account_max_failures=1)
        self.assertEqual(request(mw, LOGIN, b"\xff\xfe\x00", headers=FORM)[0], 401)
        self.assertEqual(request(mw, LOGIN, b"{no es json", headers=JSON)[0], 401)
        self.assertEqual(request(mw, LOGIN, b"[1,2,3]", headers=JSON)[0], 401)
        self.assertEqual(request(mw, LOGIN, b"", headers=FORM)[0], 401)
        long_user = "a" * 300
        self.assertEqual(request(mw, LOGIN, f"username={long_user}".encode())[0], 401)
        self.assertEqual(request(mw, LOGIN, f"username={long_user}".encode())[0], 401)
        self.assertEqual(app.calls, 6)

    def test_disabled_flags(self):
        mw, app, _ = build(enabled=False, login_limit=1)
        self.assertEqual([login(mw)[0] for _ in range(4)], [401] * 4)
        mw, app, _ = build(login_limit=100, account_lock_enabled=False, account_max_failures=1)
        self.assertEqual([login(mw)[0] for _ in range(4)], [401] * 4)

    def test_non_http_scopes_pass_through(self):
        mw, app, _ = build()
        sent = []

        async def receive():
            return {"type": "lifespan.startup"}

        async def send(message):
            sent.append(message)

        async def lifespan_app(scope, receive, send):
            sent.append(("lifespan", scope["type"]))

        mw.app = lifespan_app
        asyncio.run(mw({"type": "lifespan"}, receive, send))
        self.assertEqual(sent, [("lifespan", "lifespan")])

    def test_memory_is_bounded(self):
        mw, _, _ = build(login_limit=100, account_lock_enabled=False)
        mw.rules[0].ip_counter.max_keys = 50
        for i in range(500):
            login(mw, peer=(f"10.1.{i // 250}.{i % 250}", 1))
        self.assertLessEqual(len(mw.rules[0].ip_counter._events), 50)


if __name__ == "__main__":
    unittest.main(verbosity=2)
