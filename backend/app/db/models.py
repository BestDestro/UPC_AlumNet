import uuid
from sqlalchemy import Column, Integer, String, Boolean, Text, ForeignKey, DateTime, LargeBinary, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.connection import Base


class RoleModel(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)
    description = Column(String(255), nullable=True)


class UserModel(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(150), unique=True, index=True, nullable=False)
    full_name = Column(String(150), nullable=False)
    password_hash = Column(String, nullable=False)
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=False)
    is_active = Column(Boolean, default=True)
    mfa_enabled = Column(Boolean, default=False)
    mfa_secret = Column(String(64), nullable=True)
    avatar_url = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    role = relationship("RoleModel")


class OfferModel(Base):
    __tablename__ = "offers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(200), nullable=False)
    company = Column(String(150), nullable=False)
    description = Column(Text, nullable=False)
    offer_type = Column(String(50), nullable=False)  # 'Job', 'Internship', 'Opportunity', 'Event'
    status = Column(String(50), default="PUBLISHED") # 'PUBLISHED', 'FLAGGED', 'REMOVED'
    removal_reason = Column(Text, nullable=True)
    author_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    author = relationship("UserModel")

    @property
    def author_name(self):
        return self.author.full_name if self.author else None

    @property
    def author_role(self):
        return self.author.role.name if self.author and self.author.role else None

    @property
    def author_avatar(self):
        return self.author.avatar_url if self.author else None


class PostModel(Base):
    __tablename__ = "posts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    content = Column(Text, nullable=False)
    status = Column(String(50), default="PUBLISHED")  # 'PUBLISHED', 'FLAGGED', 'REMOVED'
    author_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    author = relationship("UserModel")

    @property
    def author_name(self):
        return self.author.full_name if self.author else None

    @property
    def author_role(self):
        return self.author.role.name if self.author and self.author.role else None

    @property
    def author_avatar(self):
        return self.author.avatar_url if self.author else None

    @property
    def likes_count(self):
        return len(self.likes) if self.likes else 0


class PostLikeModel(Base):
    __tablename__ = "post_likes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    post_id = Column(UUID(as_uuid=True), ForeignKey("posts.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    post = relationship("PostModel", backref="likes")
    user = relationship("UserModel")


class EncryptedDocumentModel(Base):
    __tablename__ = "encrypted_documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    filename = Column(String(255), nullable=False)
    content_type = Column(String(100), nullable=False)
    encrypted_blob = Column(LargeBinary, nullable=False)  # Columna BYTEA para BLOB cifrado
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    offer_id = Column(UUID(as_uuid=True), ForeignKey("offers.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class OfferApplicationModel(Base):
    __tablename__ = "offer_applications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    offer_id = Column(UUID(as_uuid=True), ForeignKey("offers.id"), nullable=False)
    applicant_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    cv_document_id = Column(UUID(as_uuid=True), ForeignKey("encrypted_documents.id"), nullable=True)
    status = Column(String(50), default="APPLIED")
    cover_note = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    offer = relationship("OfferModel", backref="applications")
    applicant = relationship("UserModel")
    cv_document = relationship("EncryptedDocumentModel")

    @property
    def applicant_name(self):
        return self.applicant.full_name if self.applicant else None

    @property
    def applicant_email(self):
        return self.applicant.email if self.applicant else None

    @property
    def applicant_avatar(self):
        return self.applicant.avatar_url if self.applicant else None

    @property
    def cv_filename(self):
        return self.cv_document.filename if self.cv_document else None
