#!/usr/bin/env python3
"""Pruebas unitarias del cifrado de BLOBs (app/core/blob_cipher.py) y de la validacion de
ficheros (app/core/file_validation.py). No usan red ni base de datos.

Necesitan la biblioteca 'cryptography' (ya instalada en el contenedor del backend):

    cd backend
    docker compose cp tests/security/test_blob_encryption.py backend:/tmp/test_blob_encryption.py
    docker compose exec backend python /tmp/test_blob_encryption.py

Tambien se pueden ejecutar en local si 'cryptography' esta instalada.
"""
import base64
import hashlib
import os
import sys
import unittest
import uuid
from pathlib import Path

# Clave de PRUEBA, solo para estos tests; se fija antes de importar el modulo.
os.environ.setdefault("BLOB_ENCRYPTION_KEY", base64.b64encode(bytes(range(1, 33))).decode())

HERE = Path(__file__).resolve()
CANDIDATES = [Path("/app")]
if len(HERE.parents) > 2:
    CANDIDATES.insert(0, HERE.parents[2])
for base in CANDIDATES:
    if (base / "app" / "__init__.py").exists():
        sys.path.insert(0, str(base))
        break

from cryptography.hazmat.primitives.ciphers.aead import AESGCM  # noqa: E402

from app.core.blob_cipher import (  # noqa: E402
    HEADER_LEN, OVERHEAD, AesGcmBlobCipher, BlobConfigError, BlobDecryptionError,
    Keyring, LegacyFormatError, document_aad,
)
from app.core.file_validation import (  # noqa: E402
    content_disposition, detect_content_type, sanitize_filename,
)

PNG = b"\x89PNG\r\n\x1a\n" + b"\x00\x00\x00\rIHDR" + os.urandom(40)
SECRET_TEXT = b"CONTENIDO-CONFIDENCIAL-DEL-CV-0123456789"


def new_key() -> bytes:
    return os.urandom(32)


def b64(key: bytes) -> str:
    return base64.b64encode(key).decode()


def make_cipher(**kwargs) -> AesGcmBlobCipher:
    return AesGcmBlobCipher(Keyring(kwargs.pop("current", new_key()), **kwargs))


class CipherTests(unittest.TestCase):
    def setUp(self):
        self.cipher = make_cipher()
        self.doc, self.owner = uuid.uuid4(), uuid.uuid4()
        self.aad = document_aad(self.doc, self.owner)

    def test_roundtrip_and_ciphertext_hides_plaintext(self):
        blob = self.cipher.encrypt(PNG + SECRET_TEXT, self.aad)
        self.assertEqual(self.cipher.decrypt(blob, self.aad), PNG + SECRET_TEXT)
        self.assertNotIn(SECRET_TEXT, blob)
        self.assertNotIn(b"PNG", blob)
        self.assertEqual(len(blob), len(PNG + SECRET_TEXT) + OVERHEAD)
        self.assertEqual(blob[:3], b"ABL")

    def test_empty_and_large_payloads(self):
        for size in (0, 1, 5 * 1024 * 1024):
            data = os.urandom(size)
            self.assertEqual(self.cipher.decrypt(self.cipher.encrypt(data, self.aad), self.aad), data)

    def test_nonce_is_unique_per_encryption(self):
        blobs = {self.cipher.encrypt(b"mismo contenido", self.aad) for _ in range(200)}
        self.assertEqual(len(blobs), 200)
        nonces = {b[HEADER_LEN:HEADER_LEN + 12] for b in blobs}
        self.assertEqual(len(nonces), 200)

    def test_tampering_any_region_is_detected(self):
        blob = bytearray(self.cipher.encrypt(PNG, self.aad))
        for position in (3, 4, HEADER_LEN, HEADER_LEN + 12, len(blob) // 2, len(blob) - 1):
            tampered = bytearray(blob)
            tampered[position] ^= 0x01
            with self.assertRaises(BlobDecryptionError, msg=f"posicion {position}"):
                self.cipher.decrypt(bytes(tampered), self.aad)

    def test_truncated_and_garbage_blobs_are_rejected(self):
        blob = self.cipher.encrypt(PNG, self.aad)
        for bad in (blob[:-1], blob[:20], b"", b"ABL", os.urandom(100)):
            with self.assertRaises(BlobDecryptionError):
                self.cipher.decrypt(bad, self.aad)

    def test_blob_is_bound_to_document_and_owner(self):
        blob = self.cipher.encrypt(PNG, self.aad)
        with self.assertRaises(BlobDecryptionError):
            self.cipher.decrypt(blob, document_aad(uuid.uuid4(), self.owner))
        with self.assertRaises(BlobDecryptionError):
            self.cipher.decrypt(blob, document_aad(self.doc, uuid.uuid4()))
        with self.assertRaises(BlobDecryptionError):
            self.cipher.decrypt(blob, b"")

    def test_wrong_key_is_rejected(self):
        blob = self.cipher.encrypt(PNG, self.aad)
        with self.assertRaises(BlobDecryptionError):
            make_cipher().decrypt(blob, self.aad)

    def test_key_rotation(self):
        old_key = new_key()
        blob = make_cipher(current=old_key).encrypt(PNG, self.aad)
        rotated = make_cipher(current=new_key(), old=[old_key])
        plaintext, origin = rotated.decrypt_with_info(blob, self.aad)
        self.assertEqual((plaintext, origin), (PNG, "old-key"))
        _, origin_new = rotated.decrypt_with_info(rotated.encrypt(PNG, self.aad), self.aad)
        self.assertEqual(origin_new, "current")

    def test_legacy_format(self):
        legacy_raw = "cadena-antigua-solo-para-tests"
        legacy_key = hashlib.sha256(legacy_raw.encode()).digest()
        nonce = os.urandom(12)
        legacy_blob = nonce + AESGCM(legacy_key).encrypt(nonce, PNG, None)
        with_legacy = make_cipher(legacy_raw=legacy_raw)
        self.assertEqual(with_legacy.decrypt_with_info(legacy_blob, self.aad), (PNG, "legacy"))
        with self.assertRaises(LegacyFormatError):
            make_cipher().decrypt(legacy_blob, self.aad)

    def test_new_format_never_decrypts_with_legacy_key_alone(self):
        blob = self.cipher.encrypt(PNG, self.aad)
        other = make_cipher(legacy_raw="otra-cadena")
        with self.assertRaises(BlobDecryptionError):
            other.decrypt(blob, self.aad)


class ConfigTests(unittest.TestCase):
    def test_missing_key_aborts(self):
        for env in ({}, {"BLOB_ENCRYPTION_KEY": ""}, {"BLOB_ENCRYPTION_KEY": "   "}):
            with self.assertRaises(BlobConfigError):
                Keyring.from_env(env)

    def test_invalid_keys_are_rejected(self):
        bad_values = [
            "no es base64 !!!",
            b64(os.urandom(16)),            # longitud incorrecta
            b64(os.urandom(48)),
            b64(b"a" * 32),                 # debil: un solo valor de byte
            b64(bytes([1, 2] * 16)),        # debil: dos valores
        ]
        for value in bad_values:
            with self.assertRaises(BlobConfigError, msg=value):
                Keyring.from_env({"BLOB_ENCRYPTION_KEY": value})

    def test_error_messages_never_contain_the_key(self):
        weak = b64(b"a" * 32)
        try:
            Keyring.from_env({"BLOB_ENCRYPTION_KEY": weak})
        except BlobConfigError as exc:
            self.assertNotIn(weak, str(exc))

    def test_valid_configuration(self):
        current, old = new_key(), new_key()
        ring = Keyring.from_env({
            "BLOB_ENCRYPTION_KEY": b64(current),
            "BLOB_ENCRYPTION_OLD_KEYS": f"{b64(old)} , ",
            "BLOB_LEGACY_KEY": "cadena",
        })
        self.assertEqual(ring.current, current)
        self.assertEqual(ring.old, (old,))
        self.assertIsNotNone(ring.legacy_key)

    def test_invalid_old_key_is_rejected(self):
        with self.assertRaises(BlobConfigError):
            Keyring.from_env({"BLOB_ENCRYPTION_KEY": b64(new_key()), "BLOB_ENCRYPTION_OLD_KEYS": "basura"})

    def test_module_level_default_key_comes_only_from_environment(self):
        source = (Path(sys.modules["app.core.blob_cipher"].__file__)).read_text()
        self.assertNotIn("default-upc", source)
        self.assertNotIn('getenv("BLOB_ENCRYPTION_KEY",', source)


class FileValidationTests(unittest.TestCase):
    def test_detects_real_signatures(self):
        self.assertEqual(detect_content_type(b"%PDF-1.7\n..."), "application/pdf")
        self.assertEqual(detect_content_type(PNG), "image/png")
        self.assertEqual(detect_content_type(b"\xff\xd8\xff\xe0" + b"\x00" * 20), "image/jpeg")

    def test_rejects_fake_and_empty_content(self):
        for data in (b"", b"esto no es una imagen", b"<html><script>alert(1)</script>", b"\x00" * 100,
                     b"GIF89a....", b"MZ\x90\x00", b" %PDF-1.4"):
            self.assertIsNone(detect_content_type(data), data)

    def test_sanitize_filename(self):
        cases = {
            "cv.pdf": "cv.pdf",
            "../../etc/passwd": "passwd",
            "C:\\Users\\ana\\cv final.pdf": "cv final.pdf",
            "a\r\nSet-Cookie: x=1.pdf": "aSet-Cookie_ x=1.pdf",
            'evil".pdf': "evil_.pdf",
            ".hidden": "hidden",
            "": "document",
            None: "document",
            "\x00\x01": "document",
            "foto\u202egnp.exe": "fotognp.exe",
        }
        for raw, expected in cases.items():
            self.assertEqual(sanitize_filename(raw), expected, repr(raw))

    def test_sanitize_filename_length_keeps_extension(self):
        result = sanitize_filename("a" * 500 + ".pdf")
        self.assertLessEqual(len(result), 200)
        self.assertTrue(result.endswith(".pdf"))

    def test_content_disposition_is_safe(self):
        header = content_disposition('mi cv "final"\r\nX-Evil: 1.pdf')
        self.assertNotIn("\r", header)
        self.assertNotIn("\n", header)
        self.assertTrue(header.startswith("attachment; filename=\""))
        self.assertEqual(header.count('"'), 2, header)
        self.assertIn("filename*=UTF-8''", header)
        header.encode("latin-1")  # las cabeceras HTTP deben poder codificarse
        unicode_header = content_disposition("curriculum-José-Ñandú.pdf")
        unicode_header.encode("latin-1")
        self.assertIn("Jos%C3%A9", unicode_header)


if __name__ == "__main__":
    unittest.main(verbosity=2)
