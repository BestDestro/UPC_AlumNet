from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session
from app.db.connection import get_db
from app.db.models import PostModel, UserModel
from app.schemas.schemas import PostCreateSchema, PostModerationSchema, PostResponseSchema
from app.api.deps import require_roles

router = APIRouter(prefix="/api/v1/posts", tags=["Posts (Social Feed)"])

ALL_ROLES = ["Student", "Alumni", "Administrator"]


@router.get("/", response_model=List[PostResponseSchema])
def list_published_posts(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_roles(ALL_ROLES))
):
    """Devuelve las publicaciones visibles de la comunidad, de más reciente a más antigua."""
    return (
        db.query(PostModel)
        .filter(PostModel.status == "PUBLISHED")
        .order_by(PostModel.created_at.desc())
        .limit(100)
        .all()
    )


@router.post("/", response_model=PostResponseSchema, status_code=status.HTTP_201_CREATED)
def create_post(
    payload: PostCreateSchema,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_roles(ALL_ROLES))
):
    """Cualquier usuario autenticado puede compartir una publicación con la comunidad."""
    post = PostModel(content=payload.content, author_id=current_user.id)
    db.add(post)
    db.commit()
    db.refresh(post)
    return post


@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_post(
    post_id: UUID,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_roles(ALL_ROLES))
):
    """El autor (o un Administrador) puede eliminar una publicación."""
    post = db.query(PostModel).filter(PostModel.id == post_id).first()
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    if post.author_id != current_user.id and current_user.role.name != "Administrator":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to delete this post")

    db.delete(post)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.patch("/{post_id}/moderate", response_model=PostResponseSchema)
def moderate_post(
    post_id: UUID,
    payload: PostModerationSchema,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_roles(["Administrator"]))
):
    """Permite a los Administradores moderar publicaciones."""
    post = db.query(PostModel).filter(PostModel.id == post_id).first()
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")

    post.status = payload.status
    db.commit()
    db.refresh(post)
    return post
