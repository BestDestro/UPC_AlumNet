"""Migra los documentos cifrados al formato v1 con la clave actual (y AAD por documento).

Convierte los blobs que estan en el formato antiguo (sin cabecera) o cifrados con una clave
anterior (BLOB_ENCRYPTION_OLD_KEYS). Por defecto SOLO INFORMA (dry-run); con --apply escribe.

Uso, dentro del contenedor del backend (desde backend/):

    docker compose exec -e BLOB_LEGACY_KEY backend python -m app.scripts.migrate_blobs
    docker compose exec -e BLOB_LEGACY_KEY backend python -m app.scripts.migrate_blobs --apply

Antes de --apply haz copia de seguridad de la tabla (pg_dump de la tabla encrypted_documents).
Cada documento se descifra, se vuelve a cifrar, se comprueba que el resultado descifra igual y
solo entonces se guarda (un commit por documento). No se imprime contenido ni nombres de fichero.
"""
import argparse
import sys

from app.core.blob_cipher import BlobDecryptionError, document_aad, get_cipher
from app.db.connection import SessionLocal
from app.db.models import EncryptedDocumentModel


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description="Migra los BLOBs cifrados al formato v1")
    parser.add_argument("--apply", action="store_true", help="escribe los cambios (por defecto solo informa)")
    args = parser.parse_args(argv)

    cipher = get_cipher()
    migrated_key = "migrados" if args.apply else "pendientes"
    counts = {"actual": 0, migrated_key: 0, "errores": 0}
    db = SessionLocal()
    try:
        ids = [row[0] for row in db.query(EncryptedDocumentModel.id)
               .order_by(EncryptedDocumentModel.created_at).all()]
        print(f"Documentos encontrados: {len(ids)}  (modo: {'APLICAR' if args.apply else 'solo informe'})")
        for doc_id in ids:
            doc = db.get(EncryptedDocumentModel, doc_id)
            aad = document_aad(doc.id, doc.owner_id)
            try:
                plaintext, origin = cipher.decrypt_with_info(doc.encrypted_blob, aad)
            except BlobDecryptionError as exc:
                counts["errores"] += 1
                print(f"  ERROR  {doc_id}: {type(exc).__name__}")
                continue
            if origin == "current":
                counts["actual"] += 1
                continue
            if args.apply:
                new_blob = cipher.encrypt(plaintext, aad)
                if cipher.decrypt(new_blob, aad) != plaintext:
                    counts["errores"] += 1
                    print(f"  ERROR  {doc_id}: la verificacion del nuevo blob ha fallado; no se guarda")
                    continue
                doc.encrypted_blob = new_blob
                db.commit()
            counts[migrated_key] += 1
            print(f"  {'MIGRADO' if args.apply else 'PENDIENTE'}  {doc_id}  (origen: {origin})")
    finally:
        db.close()

    print("Resumen:", ", ".join(f"{k}={v}" for k, v in counts.items()))
    return 1 if counts["errores"] else 0


if __name__ == "__main__":
    sys.exit(main())
