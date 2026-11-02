"""Validacion de ficheros subidos: firma real del contenido y nombres de fichero seguros.

Solo biblioteca estandar. El tipo MIME que declara el cliente NO es de fiar: se comprueba
la firma (magic bytes) del contenido. Limitacion: una firma valida no garantiza que el
fichero sea inofensivo (p. ej. un PDF puede contener scripts); por eso las descargas se
sirven como "attachment" y con "X-Content-Type-Options: nosniff".
"""
from __future__ import annotations

import re
import unicodedata
from typing import Optional
from urllib.parse import quote

SIGNATURES = (
    ("application/pdf", b"%PDF-"),
    ("image/png", b"\x89PNG\r\n\x1a\n"),
    ("image/jpeg", b"\xff\xd8\xff"),
)

# Caracteres de control, separadores de linea y controles bidireccionales (suplantacion de extension).
_UNSAFE_CHARS = re.compile("[\x00-\x1f\x7f-\x9f\u2028\u2029\u200e\u200f\u202a-\u202e\u2066-\u2069]")
_RESERVED = re.compile(r'["<>|*?:]')


def detect_content_type(data: bytes) -> Optional[str]:
    """Devuelve el tipo detectado por la firma, o None si no es PDF, PNG ni JPEG."""
    head = bytes(data[:16])
    for content_type, signature in SIGNATURES:
        if head.startswith(signature):
            return content_type
    return None


def sanitize_filename(name: Optional[str], default: str = "document", max_len: int = 200) -> str:
    """Nombre de fichero seguro para guardar y mostrar: sin rutas, sin controles, acotado."""
    if not name:
        return default
    name = name.replace("\\", "/").split("/")[-1]
    name = unicodedata.normalize("NFC", name)
    name = _UNSAFE_CHARS.sub("", name)
    name = _RESERVED.sub("_", name).strip().lstrip(".").strip()
    if len(name) > max_len:
        stem, dot, ext = name.rpartition(".")
        if dot and 0 < len(ext) <= 10:
            name = stem[: max_len - len(ext) - 1] + "." + ext
        else:
            name = name[:max_len]
    return name or default


def content_disposition(filename: Optional[str]) -> str:
    """Cabecera Content-Disposition como 'attachment', con nombre ASCII y filename* (RFC 5987)."""
    safe = sanitize_filename(filename)
    ascii_name = unicodedata.normalize("NFKD", safe).encode("ascii", "ignore").decode("ascii")
    ascii_name = re.sub(r"[^A-Za-z0-9._ -]", "_", ascii_name).strip() or "document"
    return f"attachment; filename=\"{ascii_name}\"; filename*=UTF-8''{quote(safe, safe='')}"
