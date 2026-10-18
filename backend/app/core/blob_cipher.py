import os
import hashlib
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

RAW_KEY = os.getenv("BLOB_ENCRYPTION_KEY", "default-upc-alumnet-master-key-2026")
AES_KEY = hashlib.sha256(RAW_KEY.encode("utf-8")).digest()

class BlobCipher:
    @staticmethod
    def encrypt_bytes(data: bytes) -> bytes:
        aesgcm = AESGCM(AES_KEY)
        nonce = os.urandom(12)
        ciphertext = aesgcm.encrypt(nonce, data, None)
        return nonce + ciphertext

    @staticmethod
    def decrypt_bytes(encrypted_data: bytes) -> bytes:
        aesgcm = AESGCM(AES_KEY)
        nonce = encrypted_data[:12]
        ciphertext = encrypted_data[12:]
        return aesgcm.decrypt(nonce, ciphertext, None)
