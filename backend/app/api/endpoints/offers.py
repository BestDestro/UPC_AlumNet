from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.connection import get_db
from app.db.models import OfferModel, UserModel
from app.schemas.schemas import OfferCreateSchema, OfferModerationSchema, OfferResponseSchema
from app.api.deps import require_roles

router = APIRouter(prefix="/api/v1/offers", tags=["Offers & Moderation"])


@router.get("/", response_model=List[OfferResponseSchema])
def list_published_offers(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_roles(["Student", "Alumni", "Administrator"]))
):
    """Permite a estudiantes, alumni y administradores consultar las ofertas publicadas."""
    return (
        db.query(OfferModel)
        .filter(OfferModel.status == "PUBLISHED")
        .order_by(OfferModel.created_at.desc())
        .all()
    )


@router.post("/", response_model=OfferResponseSchema, status_code=status.HTTP_201_CREATED)
def publish_offer(
    payload: OfferCreateSchema,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_roles(["Alumni", "Administrator"]))
):
    """Permite a los Alumni publicar nuevas ofertas de trabajo, prácticas u oportunidades."""
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
    return offer


@router.patch("/{offer_id}/moderate", response_model=OfferResponseSchema)
def moderate_offer(
    offer_id: UUID,
    payload: OfferModerationSchema,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_roles(["Administrator"]))
):
    """Permite a los Administradores moderar el contenido y cambiar el estado de una oferta."""
    offer = db.query(OfferModel).filter(OfferModel.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Offer not found")

    offer.status = payload.status
    db.commit()
    db.refresh(offer)
    return offer