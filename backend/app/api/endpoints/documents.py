from uuid import UUID
from typing import Optional
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Response, status
from sqlalchemy.orm import Session
from app.db.connection import get_db
from app.db.models import UserModel, EncryptedDocumentModel
from app.api.deps import get_current_user
from app.core.blob_cipher import BlobCipher

router = APIRouter(prefix="/api/v1/documents", tags=["Encrypted BLOBs"])

ALLOWED_MIME_TYPES = {"application/pdf", "image/png", "image/jpeg"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_encrypted_document(
    file: UploadFile = File(...),
    offer_id: Optional[UUID] = None,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Cifra un archivo multimedia o documento antes de guardarlo como BLOB (BYTEA) en PostgreSQL."""
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported file type. Allowed: PDF, PNG, JPEG")

    raw_bytes = await file.read()
    if len(raw_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File size exceeds 5MB limit")

    encrypted_blob = BlobCipher.encrypt_bytes(raw_bytes)

    doc = EncryptedDocumentModel(
        filename=file.filename,
        content_type=file.content_type,
        encrypted_blob=encrypted_blob,
        owner_id=current_user.id,
        offer_id=offer_id
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    return {"document_id": doc.id, "filename": doc.filename, "status": "Encrypted & Stored"}


@router.get("/{document_id}")
def download_decrypted_document(
    document_id: UUID,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Descifra el BLOB almacenado en la base de datos solo si el usuario tiene permisos."""
    doc = db.query(EncryptedDocumentModel).filter(EncryptedDocumentModel.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if doc.owner_id != current_user.id and current_user.role.name != "Administrator":
        raise HTTPException(status_code=403, detail="Not authorized to access this document")

    decrypted_bytes = BlobCipher.decrypt_bytes(doc.encrypted_blob)
    return Response(
        content=decrypted_bytes,
        media_type=doc.content_type,
        headers={"Content-Disposition": f'inline; filename="{doc.filename}"'}
    )