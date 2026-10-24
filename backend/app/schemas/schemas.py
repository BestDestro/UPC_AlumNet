from uuid import UUID
from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, EmailStr, Field, ConfigDict


# --- ESQUEMAS DE USUARIO Y AUTENTICACIÓN ---
class UserCreateSchema(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    email: EmailStr
    full_name: str = Field(..., min_length=2, max_length=150)
    password: str = Field(..., min_length=8, max_length=128)
    role_name: Literal["Student", "Alumni", "Administrator"] = "Student"


class UserResponseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: EmailStr
    full_name: str
    role_name: str
    is_active: bool


class UserProfileSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: EmailStr
    full_name: str
    role_name: str
    is_active: bool
    mfa_enabled: bool
    avatar_url: Optional[str] = None
    created_at: Optional[datetime] = None


class AvatarUpdateSchema(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    avatar_url: str = Field(..., max_length=5000000)  # Data URL or image link


class TokenResponseSchema(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str

class MFASetupResponseSchema(BaseModel):
    secret: str
    provisioning_uri: str


class MFAVerifySchema(BaseModel):
    code: str = Field(..., min_length=6, max_length=6)
    
class MFACredentialsSchema(BaseModel):
    email: EmailStr
    password: str


class MFALoginSchema(BaseModel):
    email: EmailStr
    password: str
    code: str = Field(..., min_length=6, max_length=6)
    
# --- ESQUEMAS DE OFERTAS, EVENTOS Y MODERACIÓN ---
class OfferCreateSchema(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    title: str = Field(..., min_length=5, max_length=200)
    company: str = Field(..., min_length=2, max_length=150)
    description: str = Field(..., min_length=10, max_length=5000)
    offer_type: Literal["Job", "Internship", "Opportunity", "Event"]


class OfferModerationSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: Literal["PUBLISHED", "FLAGGED", "REMOVED"]
    reason: Optional[str] = None


class OfferResponseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    company: str
    description: str
    offer_type: str
    status: str
    removal_reason: Optional[str] = None
    author_id: UUID
    author_name: Optional[str] = None
    author_role: Optional[str] = None
    author_avatar: Optional[str] = None
    applications_count: Optional[int] = 0
    has_applied: Optional[bool] = False
    created_at: datetime


class OfferApplySchema(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    cv_document_id: Optional[UUID] = None
    cover_note: Optional[str] = Field(None, max_length=1000)


class ApplicationResponseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    offer_id: UUID
    applicant_id: UUID
    applicant_name: Optional[str] = None
    applicant_email: Optional[str] = None
    applicant_avatar: Optional[str] = None
    cv_document_id: Optional[UUID] = None
    cv_filename: Optional[str] = None
    status: str
    cover_note: Optional[str] = None
    created_at: datetime


# --- ESQUEMAS DE PUBLICACIONES (FEED SOCIAL) ---
class PostCreateSchema(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    content: str = Field(..., min_length=1, max_length=2000)


class PostModerationSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: Literal["PUBLISHED", "FLAGGED", "REMOVED"]


class PostResponseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    content: str
    status: str
    author_id: UUID
    author_name: Optional[str] = None
    author_role: Optional[str] = None
    author_avatar: Optional[str] = None
    likes_count: Optional[int] = 0
    has_liked: Optional[bool] = False
    created_at: datetime


# --- ESQUEMAS DE DOCUMENTOS CIFRADOS ---
class DocumentResponseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    filename: str
    content_type: str
    created_at: Optional[datetime] = None

