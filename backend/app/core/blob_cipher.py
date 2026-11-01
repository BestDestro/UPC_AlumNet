"""Cifrado de BLOBs (documentos y otros contenidos sensibles) con AES-256-GCM.

Formato v1 (lo que se guarda en la columna BYTEA):

    "ABL" (3 bytes) | version (1) | key_id (1) | nonce (12) | cifrado + etiqueta GCM (16)

* key_id: primer byte de SHA-256(clave). Permite elegir la clave correcta al rotar claves.
* AAD (datos autenticados adicionales): la cabecera mas un contexto que aporta quien llama
  (ver document_aad: identificadores del documento y de su propietario). Un blob copiado a
  otra fila, o con la cabecera alterada, deja de descifrar.
* Nonce aleatorio de 96 bits por operacion (os.urandom).

Configuracion (variables de entorno; ver backend/.env.example):

    BLOB_ENCRYPTION_KEY        Obligatoria. 32 bytes aleatorios en base64. NO hay valor por
                               defecto: si falta o es debil, la aplicacion NO arranca.
    BLOB_ENCRYPTION_OLD_KEYS   Opcional. Claves anteriores (base64, separadas por comas), solo
                               para descifrar durante una rotacion.
    BLOB_LEGACY_KEY            Opcional y transitoria. Cadena con la que se cifraba en el
                               formato antiguo (nonce + datos, clave = SHA-256 de la cadena).
                               Solo hace falta mientras queden blobs antiguos por migrar
                               (ver app/scripts/migrate_blobs.py).

Rotacion de clave: 1) mover la clave actual a BLOB_ENCRYPTION_OLD_KEYS, 2) poner una nueva en
BLOB_ENCRYPTION_KEY, 3) ejecutar app/scripts/migrate_blobs.py --apply, 4) retirar la antigua.
"""
from __future__ import annotations

import base64
import binascii
import hashlib
import os
from typing import Mapping, Optional, Sequence, Tuple

from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

MAGIC = b"ABL"
VERSION = 1
HEADER_LEN = 5          # marca (3) + version (1) + key_id (1)
NONCE_LEN = 12
TAG_LEN = 16
KEY_LEN = 32
OVERHEAD = HEADER_LEN + NONCE_LEN + TAG_LEN
LEGACY_MIN_LEN = NONCE_LEN + TAG_LEN


class BlobConfigError(RuntimeError):
    """La configuracion de claves es incorrecta: la aplicacion no debe arrancar."""


class BlobDecryptionError(Exception):
    """No se pudo descifrar: dato manipulado, clave incorrecta o contexto (AAD) distinto."""


class LegacyFormatError(BlobDecryptionError):
    """Blob en formato antiguo y BLOB_LEGACY_KEY no esta configurada."""


def _key_id(key: bytes) -> int:
    return hashlib.sha256(key).digest()[0]


def _parse_key(value: str, name: str) -> bytes:
    try:
        key = base64.b64decode(value.strip(), validate=True)
    except (binascii.Error, ValueError):
        raise BlobConfigError(f"{name} no es base64 valido") from None
    if len(key) != KEY_LEN:
        raise BlobConfigError(f"{name} debe decodificar a {KEY_LEN} bytes (tiene {len(key)})")
    if len(set(key)) < 8:
        raise BlobConfigError(f"{name} es demasiado debil (muy poca variedad de bytes)")
    return key


class Keyring:
    def __init__(self, current: bytes, old: Sequence[bytes] = (), legacy_raw: Optional[str] = None):
        self.current = current
        self.current_id = _key_id(current)
        self.old = tuple(old)
        self.all_keys = (current,) + self.old
        self.legacy_key = (
            hashlib.sha256(legacy_raw.encode("utf-8")).digest() if legacy_raw else None
        )

    @classmethod
    def from_env(cls, env: Optional[Mapping[str, str]] = None) -> "Keyring":
        env = os.environ if env is None else env
        raw = (env.get("BLOB_ENCRYPTION_KEY") or "").strip()
        if not raw:
            raise BlobConfigError(
                "Falta BLOB_ENCRYPTION_KEY. Generala con: python3 -c \"import secrets,base64;"
                "print(base64.b64encode(secrets.token_bytes(32)).decode())\" y guardala en "
                "backend/.env (ver backend/.env.example)."
            )
        current = _parse_key(raw, "BLOB_ENCRYPTION_KEY")
        old = [
            _parse_key(part, "BLOB_ENCRYPTION_OLD_KEYS")
            for part in (env.get("BLOB_ENCRYPTION_OLD_KEYS") or "").split(",")
            if part.strip()
        ]
        legacy_raw = (env.get("BLOB_LEGACY_KEY") or "").strip() or None
        return cls(current, old, legacy_raw)


class AesGcmBlobCipher:
    def __init__(self, keyring: Keyring):
        self.keyring = keyring

    def encrypt(self, data: bytes, aad: bytes = b"") -> bytes:
        header = MAGIC + bytes([VERSION, self.keyring.current_id])
        nonce = os.urandom(NONCE_LEN)
        ciphertext = AESGCM(self.keyring.current).encrypt(nonce, bytes(data), header + aad)
        return header + nonce + ciphertext

    def decrypt(self, blob: bytes, aad: bytes = b"") -> bytes:
        return self.decrypt_with_info(blob, aad)[0]

    def decrypt_with_info(self, blob: bytes, aad: bytes = b"") -> Tuple[bytes, str]:
        """Descifra y dice con que se descifro: 'current', 'old-key' o 'legacy'."""
        blob = bytes(blob)
        looks_v1 = len(blob) >= OVERHEAD and blob[:3] == MAGIC and blob[3] == VERSION
        if looks_v1:
            header = blob[:HEADER_LEN]
            nonce = blob[HEADER_LEN:HEADER_LEN + NONCE_LEN]
            ciphertext = blob[HEADER_LEN + NONCE_LEN:]
            for key in self.keyring.all_keys:
                if _key_id(key) != header[4]:
                    continue
                try:
                    plaintext = AESGCM(key).decrypt(nonce, ciphertext, header + aad)
                except InvalidTag:
                    continue
                return plaintext, ("current" if key == self.keyring.current else "old-key")
        # Formato antiguo (o, con probabilidad 2^-32, un blob antiguo que empieza por la marca).
        if len(blob) >= LEGACY_MIN_LEN:
            if self.keyring.legacy_key is None:
                if looks_v1:
                    raise BlobDecryptionError("no se puede descifrar el blob")
                raise LegacyFormatError("blob en formato antiguo y BLOB_LEGACY_KEY no esta definida")
            try:
                plaintext = AESGCM(self.keyring.legacy_key).decrypt(
                    blob[:NONCE_LEN], blob[NONCE_LEN:], None
                )
                return plaintext, "legacy"
            except InvalidTag:
                pass
        raise BlobDecryptionError("no se puede descifrar el blob")


# ---------------------------------------------------------------------------- API de modulo
_DEFAULT: Optional[AesGcmBlobCipher] = None


def get_cipher() -> AesGcmBlobCipher:
    global _DEFAULT
    if _DEFAULT is None:
        _DEFAULT = AesGcmBlobCipher(Keyring.from_env())
    return _DEFAULT


def document_aad(document_id, owner_id) -> bytes:
    """Contexto que liga el blob a su fila: documento + propietario (UUID)."""
    return b"doc:" + document_id.bytes + owner_id.bytes


class BlobCipher:
    """Fachada estatica compatible con el uso anterior (encrypt_bytes / decrypt_bytes)."""

    @staticmethod
    def encrypt_bytes(data: bytes, aad: bytes = b"") -> bytes:
        return get_cipher().encrypt(data, aad)

    @staticmethod
    def decrypt_bytes(blob: bytes, aad: bytes = b"") -> bytes:
        return get_cipher().decrypt(blob, aad)


# Falla al importar si la clave falta o es debil: el arranque de la aplicacion se aborta
# con un mensaje claro en lugar de cifrar con una clave por defecto publicada en el repositorio.
get_cipher()
