from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.connection import get_db
from app.db.models import RoleModel, UserFollowModel, UserModel
from app.schemas.schemas import CommunityMemberSchema, CommunityProfileSchema, FollowStatusSchema

router = APIRouter(prefix="/api/v1/community", tags=["Community"])
PUBLIC_ROLES = ("Student", "Alumni")


def _member_profile(user: UserModel, is_following: bool, db: Session) -> CommunityProfileSchema:
    followers_count = db.query(UserFollowModel).filter(
        UserFollowModel.followed_id == user.id
    ).count()
    following_count = db.query(UserFollowModel).filter(
        UserFollowModel.follower_id == user.id
    ).count()
    return CommunityProfileSchema(
        id=user.id,
        full_name=user.full_name,
        email=user.email,
        role_name=user.role.name,
        avatar_url=user.avatar_url,
        bio=user.bio,
        current_position=user.current_position,
        company=user.company,
        is_following=is_following,
        followers_count=followers_count,
        following_count=following_count
    )


def _get_public_member(member_id: UUID, db: Session) -> UserModel:
    member = db.query(UserModel).join(UserModel.role).filter(
        UserModel.id == member_id,
        UserModel.is_active.is_(True),
        RoleModel.name.in_(PUBLIC_ROLES)
    ).first()
    if member is None:
        raise HTTPException(status_code=404, detail="Member profile not found")
    return member


@router.get("/members", response_model=list[CommunityMemberSchema])
def list_members(
    search: Optional[str] = Query(None, max_length=100),
    offset: int = Query(0, ge=0),
    limit: int = Query(30, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    query = db.query(UserModel).join(UserModel.role).filter(
        UserModel.is_active.is_(True),
        UserModel.id != current_user.id,
        RoleModel.name.in_(PUBLIC_ROLES)
    )
    term = (search or "").strip()
    if term:
        pattern = f"%{term}%"
        query = query.filter(or_(
            UserModel.full_name.ilike(pattern),
            UserModel.current_position.ilike(pattern),
            UserModel.company.ilike(pattern)
        ))

    members = query.order_by(UserModel.full_name.asc()).offset(offset).limit(limit).all()
    if not members:
        return []

    followed_ids = {
        row[0] for row in db.query(UserFollowModel.followed_id).filter(
            UserFollowModel.follower_id == current_user.id,
            UserFollowModel.followed_id.in_([member.id for member in members])
        ).all()
    }
    return [CommunityMemberSchema(
        id=member.id,
        full_name=member.full_name,
        role_name=member.role.name,
        avatar_url=member.avatar_url,
        current_position=member.current_position,
        company=member.company,
        is_following=member.id in followed_ids
    ) for member in members]


@router.get("/members/{member_id}", response_model=CommunityProfileSchema)
def read_member_profile(
    member_id: UUID,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    member = _get_public_member(member_id, db)
    is_following = db.query(UserFollowModel).filter(
        UserFollowModel.follower_id == current_user.id,
        UserFollowModel.followed_id == member.id
    ).first() is not None
    return _member_profile(member, is_following, db)


@router.post("/members/{member_id}/follow", response_model=FollowStatusSchema)
def follow_member(
    member_id: UUID,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    member = _get_public_member(member_id, db)
    if member.id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot follow your own profile")

    existing = db.query(UserFollowModel).filter(
        UserFollowModel.follower_id == current_user.id,
        UserFollowModel.followed_id == member.id
    ).first()
    if existing is None:
        db.add(UserFollowModel(follower_id=current_user.id, followed_id=member.id))
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            existing = db.query(UserFollowModel).filter(
                UserFollowModel.follower_id == current_user.id,
                UserFollowModel.followed_id == member.id
            ).first()
            if existing is None:
                raise
    return FollowStatusSchema(following=True)


@router.delete("/members/{member_id}/follow", response_model=FollowStatusSchema)
def unfollow_member(
    member_id: UUID,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    member = _get_public_member(member_id, db)
    if member.id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot unfollow your own profile")

    existing = db.query(UserFollowModel).filter(
        UserFollowModel.follower_id == current_user.id,
        UserFollowModel.followed_id == member.id
    ).first()
    if existing is not None:
        db.delete(existing)
        db.commit()
    return FollowStatusSchema(following=False)