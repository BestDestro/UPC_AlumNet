from uuid import UUID
from datetime import datetime
from typing import Literal
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


class TokenResponseSchema(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str

class MFASetupResponseSchema(BaseModel):
    secret: str
    provisioning_uri: str


class MFAVerifySchema(BaseModel):
    code: str = Field(..., min_length=6, max_length=6)
    
class MFALoginSchema(BaseModel):
    email: EmailStr
    password: str
    code: str = Field(..., min_length=6, max_length=6)
    
# --- ESQUEMAS DE OFERTAS Y MODERACIÓN ---
class OfferCreateSchema(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    title: str = Field(..., min_length=5, max_length=200)
    company: str = Field(..., min_length=2, max_length=150)
    description: str = Field(..., min_length=10, max_length=5000)
    offer_type: Literal["Job", "Internship", "Opportunity"]


class OfferModerationSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: Literal["PUBLISHED", "FLAGGED", "REMOVED"]


class OfferResponseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    company: str
    description: str
    offer_type: str
    status: str
    author_id: UUID
    created_at: datetime
