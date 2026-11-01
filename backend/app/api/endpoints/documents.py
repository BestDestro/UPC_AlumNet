import logging
import uuid
from uuid import UUID
from typing import List, Optional
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Response, status
from sqlalchemy.orm import Session, load_only
from app.db.connection import get_db
from app.db.models import UserModel, EncryptedDocumentModel
from app.api.deps import get_current_user
from app.core.blob_cipher import BlobCipher, BlobDecryptionError, document_aad
from app.core.file_validation import detect_content_type, sanitize_filename, content_disposition
from app.schemas.schemas import DocumentResponseSchema

logger = logging.getLogger("alumnet.documents")

router = APIRouter(prefix="/api/v1/documents", tags=["Encrypted BLOBs"])

ALLOWED_MIME_TYPES = {"application/pdf", "image/png", "image/jpeg"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB
READ_CHUNK = 64 * 1024


async def _read_limited(file: UploadFile, max_bytes: int) -> bytes:
    """Lee el fichero por bloques y aborta en cuanto supera el limite (sin cargarlo entero antes)."""
    chunks = []
    total = 0
    while True:
        chunk = await file.read(READ_CHUNK)
        if not chunk:
            break
        total += len(chunk)
        if total > max_bytes:
            raise HTTPException(status_code=400, detail="File size exceeds 5MB limit")
        chunks.append(chunk)
    return b"".join(chunks)


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

    raw_bytes = await _read_limited(file, MAX_FILE_SIZE)

    # El tipo declarado por el cliente no es de fiar: se comprueba la firma real del contenido.
    detected_type = detect_content_type(raw_bytes)
    if detected_type is None or detected_type != file.content_type:
        raise HTTPException(
            status_code=400,
            detail="File content does not match the declared type. Allowed: PDF, PNG, JPEG"
        )

    # El id se fija antes de cifrar para ligarlo al blob (AAD): un blob copiado a otra fila no descifra.
    document_id = uuid.uuid4()
    encrypted_blob = BlobCipher.encrypt_bytes(
        raw_bytes, aad=document_aad(document_id, current_user.id)
    )

    doc = EncryptedDocumentModel(
        id=document_id,
        filename=sanitize_filename(file.filename),
        content_type=detected_type,
        encrypted_blob=encrypted_blob,
        owner_id=current_user.id,
        offer_id=offer_id
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    return {"document_id": doc.id, "filename": doc.filename, "status": "Encrypted & Stored"}


@router.get("/", response_model=List[DocumentResponseSchema])
def list_my_documents(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Lista los metadatos de los documentos del usuario. El BLOB cifrado no se carga ni se descifra."""
    return (
        db.query(EncryptedDocumentModel)
        .options(load_only(
            EncryptedDocumentModel.id,
            EncryptedDocumentModel.filename,
            EncryptedDocumentModel.content_type,
            EncryptedDocumentModel.created_at
        ))
        .filter(EncryptedDocumentModel.owner_id == current_user.id)
        .order_by(EncryptedDocumentModel.created_at.desc())
        .all()
    )


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

    is_owner = (doc.owner_id == current_user.id)
    is_offer_author = False
    if not is_owner:
        from app.db.models import OfferApplicationModel, OfferModel
        is_offer_author = db.query(OfferApplicationModel).join(OfferModel).filter(
            OfferApplicationModel.cv_document_id == doc.id,
            OfferModel.author_id == current_user.id
        ).first() is not None

    if not (is_owner or is_offer_author):
        raise HTTPException(status_code=403, detail="No tienes autorización para acceder a este documento")

    try:
        decrypted_bytes = BlobCipher.decrypt_bytes(
            doc.encrypted_blob, aad=document_aad(doc.id, doc.owner_id)
        )
    except BlobDecryptionError as exc:
        # Se registra el motivo tecnico (sin contenido) y se devuelve un error controlado.
        logger.error("No se pudo descifrar el documento %s (%s)", doc.id, type(exc).__name__)
        raise HTTPException(status_code=500, detail="Document could not be decrypted")

    return Response(
        content=decrypted_bytes,
        media_type=doc.content_type,
        headers={
            "Content-Disposition": content_disposition(doc.filename),
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "private, no-store",
        }
    )
