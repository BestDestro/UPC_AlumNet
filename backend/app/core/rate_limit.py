"""Capa 3 de defensa: rate limiting y proteccion de fuerza bruta en la propia aplicacion.

Complementa (NO sustituye) a las capas de Nginx (backend/nginx/security/rate-limit.conf):

  Capa 1  Nginx: limite por IP en los endpoints de autenticacion.
  Capa 2  Nginx: cabeceras de seguridad y CSP.
  Capa 3  Este modulo, dentro de FastAPI. Aporta dos cosas que Nginx no puede dar:
          a) Un limite por IP tambien cuando alguien llega directo al puerto 8443,
             saltandose Nginx.
          b) Un limite por CUENTA (intentos fallidos por correo, desde cualquier IP),
             que frena la fuerza bruta distribuida contra una misma cuenta.

Diseno
------
* ASGI puro y solo biblioteca estandar: no anade dependencias ni depende de la
  version de Starlette.
* Se activa con una sola linea en app/main.py: app.add_middleware(RateLimitMiddleware).
* Solo mira peticiones POST a las rutas de autenticacion indicadas en RULES; el resto
  de rutas pasa sin tocarse.
* IP del cliente: se usa la direccion del socket. La cabecera X-Real-IP (que pone
  Nginx) solo se acepta si la conexion viene de un proxy de confianza
  (por defecto, el servicio Docker "nginx"). Quien llegue directo al 8443 no puede
  falsificar su IP con cabeceras.
* Los contadores viven en memoria del proceso: se pierden al reiniciar y no se
  comparten entre varios workers de Uvicorn (el Dockerfile lanza uno solo).

Limitaciones conocidas (documentar en el informe)
-------------------------------------------------
* El bloqueo por cuenta permite a un atacante bloquear temporalmente a una victima
  fallando a proposito su login (denegacion de servicio dirigida). Es el precio
  habitual de esta defensa; se limita con un umbral alto y una ventana corta, y se
  puede desactivar con RATE_LIMIT_ACCOUNT_LOCK=false.
* Un atacante con muchas IPs puede repartir intentos contra muchas cuentas distintas.
* Detras de Nginx, en entorno local, todos los clientes pueden verse como la
  puerta de enlace de Docker y compartir contador.

Variables de entorno (todas opcionales)
---------------------------------------
RATE_LIMIT_ENABLED               true   Activa o desactiva toda la capa.
RATE_LIMIT_LOGIN_LIMIT           10     Peticiones por ventana y por IP (login y MFA).
RATE_LIMIT_LOGIN_WINDOW          60     Ventana en segundos.
RATE_LIMIT_REGISTER_LIMIT        5      Peticiones por ventana y por IP (registro).
RATE_LIMIT_REGISTER_WINDOW       60     Ventana en segundos.
RATE_LIMIT_ACCOUNT_LOCK          true   Activa el bloqueo por cuenta.
RATE_LIMIT_ACCOUNT_MAX_FAILURES  10     Intentos fallidos (401) permitidos por cuenta.
RATE_LIMIT_ACCOUNT_WINDOW        900    Ventana en segundos (15 minutos).
RATE_LIMIT_TRUSTED_PROXIES       nginx  Hosts, IPs o CIDR separados por comas.
"""
from __future__ import annotations

import hashlib
import ipaddress
import json
import logging
import math
import os
import re
import socket
import time
from collections import deque
from dataclasses import dataclass
from typing import Callable, Deque, Dict, List, Optional, Sequence, Tuple
from urllib.parse import parse_qs

logger = logging.getLogger("alumnet.ratelimit")

# Rutas protegidas. Los cuatro primeros endpoints comprueban una contrasena.
LOGIN_PATH = re.compile(
    r"^/api/v1/auth/(login|mfa/login|mfa/setup-credentials|mfa/enable-credentials)/?$"
)
REGISTER_PATH = re.compile(r"^/api/v1/auth/register/?$")


# --------------------------------------------------------------------------- config
def _env_int(name: str, default: int, minimum: int = 1) -> int:
    try:
        value = int(os.getenv(name, str(default)))
    except ValueError:
        value = default
    return max(value, minimum)


def _env_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in ("1", "true", "yes", "on")


@dataclass(frozen=True)
class RateLimitConfig:
    enabled: bool = True
    login_limit: int = 10
    login_window: int = 60
    register_limit: int = 5
    register_window: int = 60
    account_lock_enabled: bool = True
    account_max_failures: int = 10
    account_window: int = 900
    trusted_proxies: Tuple[str, ...] = ("nginx",)
    max_keys: int = 10000
    max_body_bytes: int = 16384

    @classmethod
    def from_env(cls) -> "RateLimitConfig":
        proxies = tuple(
            p.strip()
            for p in os.getenv("RATE_LIMIT_TRUSTED_PROXIES", "nginx").split(",")
            if p.strip()
        )
        return cls(
            enabled=_env_bool("RATE_LIMIT_ENABLED", True),
            login_limit=_env_int("RATE_LIMIT_LOGIN_LIMIT", 10),
            login_window=_env_int("RATE_LIMIT_LOGIN_WINDOW", 60),
            register_limit=_env_int("RATE_LIMIT_REGISTER_LIMIT", 5),
            register_window=_env_int("RATE_LIMIT_REGISTER_WINDOW", 60),
            account_lock_enabled=_env_bool("RATE_LIMIT_ACCOUNT_LOCK", True),
            account_max_failures=_env_int("RATE_LIMIT_ACCOUNT_MAX_FAILURES", 10),
            account_window=_env_int("RATE_LIMIT_ACCOUNT_WINDOW", 900),
            trusted_proxies=proxies,
        )


# --------------------------------------------------------------------------- contadores
class SlidingWindowCounter:
    """Ventana deslizante: como maximo `limit` eventos en los ultimos `window` segundos."""

    def __init__(self, limit: int, window: int, max_keys: int, clock: Callable[[], float]):
        self.limit = limit
        self.window = window
        self.max_keys = max_keys
        self.clock = clock
        self._events: Dict[str, Deque[float]] = {}

    def _live(self, key: str, now: float) -> Optional[Deque[float]]:
        events = self._events.get(key)
        if events is None:
            return None
        while events and now - events[0] >= self.window:
            events.popleft()
        if not events:
            del self._events[key]
            return None
        return events

    def _retry_after(self, events: Deque[float], now: float) -> int:
        return max(math.ceil(self.window - (now - events[0])), 1)

    def _make_room(self, now: float) -> None:
        if len(self._events) < self.max_keys:
            return
        for key in list(self._events):
            self._live(key, now)
        while len(self._events) >= self.max_keys:
            # Expulsa la clave mas antigua (el dict conserva el orden de insercion).
            del self._events[next(iter(self._events))]

    def hit(self, key: str) -> Tuple[bool, int]:
        """Registra un evento si no se supera el limite. Devuelve (permitido, retry_after)."""
        now = self.clock()
        events = self._live(key, now)
        if events is not None and len(events) >= self.limit:
            return False, self._retry_after(events, now)
        if events is None:
            self._make_room(now)
            events = deque(maxlen=self.limit)
            self._events[key] = events
        events.append(now)
        return True, 0

    def blocked(self, key: str) -> Tuple[bool, int]:
        """Dice si la clave ha alcanzado el limite, sin registrar nada."""
        now = self.clock()
        events = self._live(key, now)
        if events is not None and len(events) >= self.limit:
            return True, self._retry_after(events, now)
        return False, 0

    def record(self, key: str) -> None:
        """Registra un evento sin comprobar el limite (p. ej. un intento fallido)."""
        now = self.clock()
        events = self._live(key, now)
        if events is None:
            self._make_room(now)
            events = deque(maxlen=self.limit)
            self._events[key] = events
        events.append(now)

    def reset(self, key: str) -> None:
        self._events.pop(key, None)


# --------------------------------------------------------------------------- IP del cliente
def _dns_resolve(host: str) -> List[str]:
    return [info[4][0].split("%")[0] for info in socket.getaddrinfo(host, None)]


class TrustedProxies:
    """Conjunto de proxies de confianza: IPs, CIDR o nombres de host (resueltos con cache)."""

    def __init__(
        self,
        entries: Sequence[str],
        resolver: Callable[[str], List[str]] = _dns_resolve,
        clock: Callable[[], float] = time.monotonic,
        ttl: int = 60,
    ):
        self.entries = tuple(entries)
        self.resolver = resolver
        self.clock = clock
        self.ttl = ttl
        self._networks: List[ipaddress._BaseNetwork] = []
        self._expires = float("-inf")

    def _refresh(self) -> None:
        now = self.clock()
        if now < self._expires:
            return
        networks: List[ipaddress._BaseNetwork] = []
        for entry in self.entries:
            try:
                networks.append(ipaddress.ip_network(entry, strict=False))
                continue
            except ValueError:
                pass
            try:
                for address in self.resolver(entry):
                    networks.append(ipaddress.ip_network(address))
            except (OSError, ValueError):
                # Si no se puede resolver, no se confia en nada: se usa la IP del socket.
                pass
        self._networks = networks
        self._expires = now + self.ttl

    def is_trusted(self, ip: str) -> bool:
        try:
            address = ipaddress.ip_address(ip)
        except ValueError:
            return False
        self._refresh()
        return any(address in network for network in self._networks)


def client_ip(scope: dict, trusted: TrustedProxies) -> str:
    client = scope.get("client")
    peer = client[0] if client else "unknown"
    if peer != "unknown" and trusted.is_trusted(peer):
        for name, value in scope.get("headers", []):
            if name == b"x-real-ip":
                try:
                    return str(ipaddress.ip_address(value.decode("latin-1").strip()))
                except ValueError:
                    break
    return peer


# --------------------------------------------------------------------------- cuenta
def account_key(headers: Dict[bytes, bytes], body: Optional[bytes]) -> Optional[str]:
    """Identificador de cuenta (hash) sacado del cuerpo del login, o None si no se puede."""
    if not body:
        return None
    content_type = headers.get(b"content-type", b"").decode("latin-1").split(";")[0].strip().lower()
    identifier = None
    try:
        if content_type == "application/x-www-form-urlencoded":
            values = parse_qs(body.decode("utf-8"))
            candidates = values.get("username") or values.get("email") or []
            identifier = candidates[0] if candidates else None
        elif content_type == "application/json":
            data = json.loads(body.decode("utf-8"))
            if isinstance(data, dict):
                value = data.get("email") or data.get("username")
                identifier = value if isinstance(value, str) else None
    except (UnicodeDecodeError, ValueError, RecursionError):
        return None
    if not identifier:
        return None
    identifier = identifier.strip().lower()
    if not identifier or len(identifier) > 254:
        return None
    return hashlib.sha256(identifier.encode("utf-8")).hexdigest()[:32]


# --------------------------------------------------------------------------- middleware
@dataclass
class _Rule:
    name: str
    pattern: "re.Pattern[str]"
    ip_counter: SlidingWindowCounter
    track_account: bool


class RateLimitMiddleware:
    def __init__(
        self,
        app,
        config: Optional[RateLimitConfig] = None,
        clock: Callable[[], float] = time.monotonic,
        resolver: Callable[[str], List[str]] = _dns_resolve,
    ):
        self.app = app
        self.cfg = config or RateLimitConfig.from_env()
        c = self.cfg
        self.trusted = TrustedProxies(c.trusted_proxies, resolver=resolver, clock=clock)
        self.failures = SlidingWindowCounter(c.account_max_failures, c.account_window, c.max_keys, clock)
        self.rules = [
            _Rule("login", LOGIN_PATH,
                  SlidingWindowCounter(c.login_limit, c.login_window, c.max_keys, clock), True),
            _Rule("register", REGISTER_PATH,
                  SlidingWindowCounter(c.register_limit, c.register_window, c.max_keys, clock), False),
        ]

    def _match(self, path: str) -> Optional[_Rule]:
        for rule in self.rules:
            if rule.pattern.match(path):
                return rule
        return None

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or not self.cfg.enabled or scope.get("method") != "POST":
            return await self.app(scope, receive, send)
        rule = self._match(scope.get("path", ""))
        if rule is None:
            return await self.app(scope, receive, send)

        ip = client_ip(scope, self.trusted)
        allowed, retry_after = rule.ip_counter.hit(ip)
        if not allowed:
            logger.warning("rate limit por IP: regla=%s ip=%s retry_after=%ss", rule.name, ip, retry_after)
            return await self._reject(send, retry_after)

        key = None
        if rule.track_account and self.cfg.account_lock_enabled:
            body, receive = await self._buffer_body(receive)
            key = account_key(dict(scope.get("headers", [])), body)
            if key:
                blocked, retry_after = self.failures.blocked(key)
                if blocked:
                    logger.warning("bloqueo por cuenta: regla=%s cuenta=%s ip=%s retry_after=%ss",
                                   rule.name, key[:8], ip, retry_after)
                    return await self._reject(send, retry_after)

        outcome = {"status": None}

        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                outcome["status"] = message["status"]
            await send(message)

        await self.app(scope, receive, send_wrapper)

        if key:
            status = outcome["status"]
            if status == 401:
                self.failures.record(key)
            elif status is not None and 200 <= status < 300:
                self.failures.reset(key)

    async def _buffer_body(self, receive):
        """Lee el cuerpo (hasta max_body_bytes) y devuelve (cuerpo|None, receive que lo reproduce)."""
        messages = []
        total = 0
        complete = False
        while True:
            message = await receive()
            messages.append(message)
            if message["type"] != "http.request":
                break
            total += len(message.get("body", b""))
            if not message.get("more_body", False):
                complete = True
                break
            if total > self.cfg.max_body_bytes:
                break
        body = None
        if complete:
            body = b"".join(m.get("body", b"") for m in messages if m["type"] == "http.request")
        pending = iter(messages)

        async def replay():
            try:
                return next(pending)
            except StopIteration:
                return await receive()

        return body, replay

    @staticmethod
    async def _reject(send, retry_after: int):
        body = json.dumps({"detail": "Too many requests. Try again later."}).encode()
        await send({
            "type": "http.response.start",
            "status": 429,
            "headers": [
                (b"content-type", b"application/json"),
                (b"content-length", str(len(body)).encode()),
                (b"retry-after", str(retry_after).encode()),
            ],
        })
        await send({"type": "http.response.body", "body": body})
