from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session
from app.db.connection import get_db
from app.db.models import PostModel, UserModel, PostLikeModel
from app.schemas.schemas import PostCreateSchema, PostModerationSchema, PostResponseSchema
from app.api.deps import require_roles

router = APIRouter(prefix="/api/v1/posts", tags=["Posts (Social Feed)"])

ALL_ROLES = ["Student", "Alumni", "Administrator"]


@router.get("/", response_model=List[PostResponseSchema])
def list_published_posts(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_roles(ALL_ROLES))
):
    """Devuelve las publicaciones visibles de la comunidad con sus fotos de perfil y likes."""
    posts = (
        db.query(PostModel)
        .filter(PostModel.status == "PUBLISHED")
        .order_by(PostModel.created_at.desc())
        .limit(100)
        .all()
    )
    result = []
    for p in posts:
        likes_cnt = db.query(PostLikeModel).filter(PostLikeModel.post_id == p.id).count()
        user_liked = db.query(PostLikeModel).filter(
            PostLikeModel.post_id == p.id,
            PostLikeModel.user_id == current_user.id
        ).first() is not None

        result.append(
            PostResponseSchema(
                id=p.id,
                content=p.content,
                status=p.status,
                author_id=p.author_id,
                author_name=p.author_name,
                author_role=p.author_role,
                author_avatar=p.author_avatar,
                likes_count=likes_cnt,
                has_liked=user_liked,
                created_at=p.created_at
            )
        )
    return result


@router.post("/{post_id}/like")
def toggle_like_post(
    post_id: UUID,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_roles(ALL_ROLES))
):
    """Permite dar o quitar like a una publicación con persistencia en base de datos."""
    post = db.query(PostModel).filter(PostModel.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Publicación no encontrada")

    existing_like = db.query(PostLikeModel).filter(
        PostLikeModel.post_id == post_id,
        PostLikeModel.user_id == current_user.id
    ).first()

    if existing_like:
        db.delete(existing_like)
        db.commit()
        has_liked = False
    else:
        new_like = PostLikeModel(post_id=post_id, user_id=current_user.id)
        db.add(new_like)
        db.commit()
        has_liked = True

    likes_count = db.query(PostLikeModel).filter(PostLikeModel.post_id == post_id).count()
    return {"post_id": post_id, "likes_count": likes_count, "has_liked": has_liked}


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

    return PostResponseSchema(
        id=post.id,
        content=post.content,
        status=post.status,
        author_id=post.author_id,
        author_name=post.author_name,
        author_role=post.author_role,
        author_avatar=post.author_avatar,
        likes_count=0,
        has_liked=False,
        created_at=post.created_at
    )


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
