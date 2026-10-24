from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.connection import get_db
from app.db.models import OfferModel, UserModel, OfferApplicationModel, EncryptedDocumentModel
from app.schemas.schemas import (
    OfferCreateSchema,
    OfferModerationSchema,
    OfferResponseSchema,
    OfferApplySchema,
    ApplicationResponseSchema
)
from app.api.deps import require_roles

router = APIRouter(prefix="/api/v1/offers", tags=["Offers & Moderation"])


@router.get("/", response_model=List[OfferResponseSchema])
def list_published_offers(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_roles(["Student", "Alumni", "Administrator"]))
):
    """Permite a estudiantes, alumni y administradores consultar las ofertas y eventos publicados."""
    offers = (
        db.query(OfferModel)
        .filter(OfferModel.status == "PUBLISHED")
        .order_by(OfferModel.created_at.desc())
        .all()
    )
    result = []
    for o in offers:
        app_count = db.query(OfferApplicationModel).filter(OfferApplicationModel.offer_id == o.id).count()
        applied = db.query(OfferApplicationModel).filter(
            OfferApplicationModel.offer_id == o.id,
            OfferApplicationModel.applicant_id == current_user.id
        ).first() is not None

        result.append(
            OfferResponseSchema(
                id=o.id,
                title=o.title,
                company=o.company,
                description=o.description,
                offer_type=o.offer_type,
                status=o.status,
                author_id=o.author_id,
                author_name=o.author_name,
                author_role=o.author_role,
                author_avatar=o.author_avatar,
                applications_count=app_count,
                has_applied=applied,
                created_at=o.created_at
            )
        )
    return result


@router.post("/", response_model=OfferResponseSchema, status_code=status.HTTP_201_CREATED)
def publish_offer(
    payload: OfferCreateSchema,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_roles(["Alumni", "Administrator"]))
):
    """Permite a los Alumni publicar ofertas laborales y únicamente a los Administradores publicar eventos."""
    if payload.offer_type == "Event" and current_user.role.name != "Administrator":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Únicamente los administradores pueden publicar eventos oficiales"
        )

    offer = OfferModel(
        title=payload.title,
        company=payload.company,
        description=payload.description,
        offer_type=payload.offer_type,
        author_id=current_user.id
    )
    db.add(offer)
    db.commit()
    db.refresh(offer)

    return OfferResponseSchema(
        id=offer.id,
        title=offer.title,
        company=offer.company,
        description=offer.description,
        offer_type=offer.offer_type,
        status=offer.status,
        author_id=offer.author_id,
        author_name=offer.author_name,
        author_role=offer.author_role,
        author_avatar=offer.author_avatar,
        applications_count=0,
        has_applied=False,
        created_at=offer.created_at
    )


@router.post("/{offer_id}/apply", response_model=ApplicationResponseSchema, status_code=status.HTTP_201_CREATED)
def apply_to_offer(
    offer_id: UUID,
    payload: OfferApplySchema,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_roles(["Student", "Alumni", "Administrator"]))
):
    """Permite a los estudiantes y alumni postularse a una oferta adjuntando su CV cifrado."""
    if current_user.role.name == "Administrator":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Los administradores no pueden postularse a ofertas ni eventos"
        )

    offer = db.query(OfferModel).filter(OfferModel.id == offer_id).first()
    if not offer or offer.status != "PUBLISHED":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Oferta no encontrada o no disponible")

    # Verificar que no se haya postulado previamente
    existing = db.query(OfferApplicationModel).filter(
        OfferApplicationModel.offer_id == offer_id,
        OfferApplicationModel.applicant_id == current_user.id
    ).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ya te has postulado a esta oferta")

    # Validar documento de CV
    cv_doc_id = payload.cv_document_id
    if cv_doc_id:
        doc = db.query(EncryptedDocumentModel).filter(
            EncryptedDocumentModel.id == cv_doc_id,
            EncryptedDocumentModel.owner_id == current_user.id
        ).first()
        if not doc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Documento de CV no encontrado")
    else:
        # Usar el último documento subido por el usuario
        latest_doc = db.query(EncryptedDocumentModel).filter(
            EncryptedDocumentModel.owner_id == current_user.id
        ).order_by(EncryptedDocumentModel.created_at.desc()).first()
        if not latest_doc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Debes subir tu CV en tu perfil antes de postularte a un puesto"
            )
        cv_doc_id = latest_doc.id

    application = OfferApplicationModel(
        offer_id=offer.id,
        applicant_id=current_user.id,
        cv_document_id=cv_doc_id,
        cover_note=payload.cover_note
    )
    db.add(application)
    db.commit()
    db.refresh(application)
    return application


@router.get("/{offer_id}/applications", response_model=List[ApplicationResponseSchema])
def list_offer_applications(
    offer_id: UUID,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_roles(["Student", "Alumni", "Administrator"]))
):
    """Permite únicamente al Alumni o autor que ha publicado la oferta consultar los candidatos y sus CVs."""
    if current_user.role.name == "Administrator":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Los administradores no tienen autorización para ver los candidatos de las ofertas"
        )

    offer = db.query(OfferModel).filter(OfferModel.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Oferta no encontrada")

    if offer.author_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo el usuario que ha publicado este puesto puede consultar los candidatos y sus CVs"
        )

    return (
        db.query(OfferApplicationModel)
        .filter(OfferApplicationModel.offer_id == offer_id)
        .order_by(OfferApplicationModel.created_at.desc())
        .all()
    )


@router.delete("/{offer_id}", response_model=OfferResponseSchema)
def delete_offer(
    offer_id: UUID,
    reason: str = None,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_roles(["Administrator", "Alumni"]))
):
    """Permite borrar una oferta; el Administrador debe introducir obligatoriamente un motivo."""
    offer = db.query(OfferModel).filter(OfferModel.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Oferta no encontrada")

    if current_user.role.name == "Administrator":
        if not reason or len(reason.strip()) < 3:
            raise HTTPException(status_code=400, detail="El administrador debe introducir un motivo de eliminación")
        offer.status = "REMOVED"
        offer.removal_reason = reason.strip()
    elif offer.author_id == current_user.id:
        offer.status = "REMOVED"
        offer.removal_reason = reason or "Eliminada por el autor"
    else:
        raise HTTPException(status_code=403, detail="No autorizado para eliminar esta oferta")

    db.commit()
    db.refresh(offer)

    app_count = db.query(OfferApplicationModel).filter(OfferApplicationModel.offer_id == offer.id).count()
    return OfferResponseSchema(
        id=offer.id,
        title=offer.title,
        company=offer.company,
        description=offer.description,
        offer_type=offer.offer_type,
        status=offer.status,
        removal_reason=offer.removal_reason,
        author_id=offer.author_id,
        author_name=offer.author_name,
        author_role=offer.author_role,
        author_avatar=offer.author_avatar,
        applications_count=app_count,
        has_applied=False,
        created_at=offer.created_at
    )


@router.patch("/{offer_id}/moderate", response_model=OfferResponseSchema)
def moderate_offer(
    offer_id: UUID,
    payload: OfferModerationSchema,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_roles(["Administrator"]))
):
    """Permite a los Administradores moderar el contenido indicando un motivo en caso de retirada."""
    offer = db.query(OfferModel).filter(OfferModel.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Offer not found")

    if payload.status == "REMOVED":
        if not payload.reason or len(payload.reason.strip()) < 3:
            raise HTTPException(status_code=400, detail="Debe indicar el motivo de retirada de la oferta")
        offer.removal_reason = payload.reason.strip()

    offer.status = payload.status
    db.commit()
    db.refresh(offer)

    app_count = db.query(OfferApplicationModel).filter(OfferApplicationModel.offer_id == offer.id).count()
    return OfferResponseSchema(
        id=offer.id,
        title=offer.title,
        company=offer.company,
        description=offer.description,
        offer_type=offer.offer_type,
        status=offer.status,
        removal_reason=offer.removal_reason,
        author_id=offer.author_id,
        author_name=offer.author_name,
        author_role=offer.author_role,
        author_avatar=offer.author_avatar,
        applications_count=app_count,
        has_applied=False,
        created_at=offer.created_at
    )