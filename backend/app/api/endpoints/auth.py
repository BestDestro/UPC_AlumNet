import pyotp
from datetime import datetime, timezone
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.db.connection import get_db
from app.db.models import RoleChangeRequestModel, UserModel, RoleModel
from app.schemas.schemas import (
    UserCreateSchema,
    UserResponseSchema,
    TokenResponseSchema,
    MFASetupResponseSchema,
    MFAVerifySchema,
    MFALoginSchema,
    MFACredentialsSchema,
    UserProfileSchema,
    AvatarUpdateSchema,
    ProfileUpdateSchema,
    RoleChangeRequestCreateSchema,
    RoleChangeRequestReviewSchema,
    RoleChangeRequestResponseSchema
)
from app.core.security import hash_password, verify_password, create_access_token
from app.api.deps import get_current_user, require_roles

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])


def validate_upc_email(email: str):
    """Garantiza que únicamente se admitan correos institucionales de la UPC (@upc.edu o subdominios)."""
    clean_email = email.strip().lower()
    if not (clean_email.endswith("@upc.edu") or clean_email.endswith(".upc.edu")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Solo se permiten correos institucionales de la UPC (@upc.edu o subdominios .upc.edu)"
        )


@router.post("/register", response_model=UserResponseSchema, status_code=status.HTTP_201_CREATED)
def register(payload: UserCreateSchema, db: Session = Depends(get_db)):
    """Registra un usuario Student o Alumni con contraseña hasheada en Argon2id."""
    validate_upc_email(payload.email)

    if db.query(UserModel).filter(UserModel.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    role = db.query(RoleModel).filter(RoleModel.name == payload.role_name).first()
    if not role:
        raise HTTPException(status_code=400, detail="Invalid role specified")

    new_user = UserModel(
        email=payload.email,
        full_name=payload.full_name,
        password_hash=hash_password(payload.password),
        role_id=role.id
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return UserResponseSchema(
        id=new_user.id,
        email=new_user.email,
        full_name=new_user.full_name,
        role_name=role.name,
        is_active=new_user.is_active
    )


@router.post("/login", response_model=TokenResponseSchema)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Autentica al usuario y devuelve un API Token JWT."""
    validate_upc_email(form_data.username)

    user = db.query(UserModel).filter(UserModel.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is inactive")
    if user.mfa_enabled:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="MFA required")
    token = create_access_token(
        data={"sub": str(user.id), "role": user.role.name, "email": user.email}
    )
    return TokenResponseSchema(access_token=token, role=user.role.name)


@router.get("/me", response_model=UserProfileSchema)
def read_current_user(current_user: UserModel = Depends(get_current_user)):
    """Devuelve los datos de perfil del usuario autenticado (sin secretos)."""
    return UserProfileSchema(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role_name=current_user.role.name,
        is_active=current_user.is_active,
        mfa_enabled=bool(current_user.mfa_enabled),
        avatar_url=current_user.avatar_url,
        bio=current_user.bio,
        current_position=current_user.current_position,
        company=current_user.company,
        created_at=current_user.created_at
    )


@router.patch("/profile", response_model=UserProfileSchema)
def update_current_user_profile(
    payload: ProfileUpdateSchema,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Actualiza el perfil laboral solo para cuentas Student y Alumni."""
    if current_user.role.name not in {"Student", "Alumni"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Student and Alumni accounts can edit their profile"
        )

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(current_user, field, value or None)
    db.commit()
    db.refresh(current_user)

    return read_current_user(current_user)


def serialize_role_change_request(request: RoleChangeRequestModel):
    return RoleChangeRequestResponseSchema(
        id=request.id,
        user_id=request.user_id,
        requester_name=request.requester.full_name,
        requester_email=request.requester.email,
        current_role=request.current_role,
        requested_role=request.requested_role,
        reason=request.reason,
        status=request.status,
        review_note=request.review_note,
        created_at=request.created_at,
        reviewed_at=request.reviewed_at
    )


@router.post("/role-requests", response_model=RoleChangeRequestResponseSchema, status_code=status.HTTP_201_CREATED)
def create_role_change_request(
    payload: RoleChangeRequestCreateSchema,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    current_role = current_user.role.name
    if current_role not in {"Student", "Alumni"}:
        raise HTTPException(status_code=403, detail="Only Student and Alumni can request this change")
    if payload.requested_role == current_role:
        raise HTTPException(status_code=400, detail="The requested role must be different from your current role")
    pending = db.query(RoleChangeRequestModel).filter(
        RoleChangeRequestModel.user_id == current_user.id,
        RoleChangeRequestModel.status == "PENDING"
    ).first()
    if pending:
        raise HTTPException(status_code=409, detail="You already have a pending role change request")

    request = RoleChangeRequestModel(
        user_id=current_user.id,
        current_role=current_role,
        requested_role=payload.requested_role,
        reason=payload.reason
    )
    db.add(request)
    db.commit()
    db.refresh(request)
    return serialize_role_change_request(request)


@router.get("/role-requests/me", response_model=list[RoleChangeRequestResponseSchema])
def list_my_role_change_requests(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    requests = db.query(RoleChangeRequestModel).filter(
        RoleChangeRequestModel.user_id == current_user.id
    ).order_by(RoleChangeRequestModel.created_at.desc()).all()
    return [serialize_role_change_request(request) for request in requests]


@router.get("/role-requests/pending", response_model=list[RoleChangeRequestResponseSchema])
def list_pending_role_change_requests(
    db: Session = Depends(get_db),
    _: UserModel = Depends(require_roles(["Administrator"]))
):
    requests = db.query(RoleChangeRequestModel).filter(
        RoleChangeRequestModel.status == "PENDING"
    ).order_by(RoleChangeRequestModel.created_at.asc()).all()
    return [serialize_role_change_request(request) for request in requests]


@router.patch("/role-requests/{request_id}/review", response_model=RoleChangeRequestResponseSchema)
def review_role_change_request(
    request_id: UUID,
    payload: RoleChangeRequestReviewSchema,
    db: Session = Depends(get_db),
    admin: UserModel = Depends(require_roles(["Administrator"]))
):
    request = db.query(RoleChangeRequestModel).filter(
        RoleChangeRequestModel.id == request_id
    ).with_for_update().first()
    if request is None:
        raise HTTPException(status_code=404, detail="Role change request not found")
    if request.status != "PENDING":
        raise HTTPException(status_code=409, detail="This request has already been reviewed")

    if payload.decision == "APPROVED":
        role = db.query(RoleModel).filter(RoleModel.name == request.requested_role).first()
        if role is None:
            raise HTTPException(status_code=500, detail="Requested role is not configured")
        request.requester.role = role
        request.requester.role_id = role.id

    request.status = payload.decision
    request.review_note = payload.review_note
    request.reviewed_by = admin.id
    request.reviewed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(request)
    return serialize_role_change_request(request)


@router.patch("/avatar", response_model=UserProfileSchema)
def update_user_avatar(
    payload: AvatarUpdateSchema,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Actualiza la foto de perfil en la base de datos."""
    current_user.avatar_url = payload.avatar_url
    db.commit()
    db.refresh(current_user)
    return UserProfileSchema(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role_name=current_user.role.name,
        is_active=current_user.is_active,
        mfa_enabled=bool(current_user.mfa_enabled),
        avatar_url=current_user.avatar_url,
        bio=current_user.bio,
        current_position=current_user.current_position,
        company=current_user.company,
        created_at=current_user.created_at
    )


@router.post("/mfa/setup", response_model=MFASetupResponseSchema)
def setup_mfa(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    secret = pyotp.random_base32()

    current_user.mfa_secret = secret
    current_user.mfa_enabled = False

    db.commit()
    db.refresh(current_user)

    totp = pyotp.TOTP(secret)

    provisioning_uri = totp.provisioning_uri(
        name=current_user.email,
        issuer_name="UPC AlumNet"
    )

    return MFASetupResponseSchema(
        secret=secret,
        provisioning_uri=provisioning_uri
    )

@router.post("/mfa/enable")
def enable_mfa(
    payload: MFAVerifySchema,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user.mfa_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA setup has not been completed"
        )

    totp = pyotp.TOTP(current_user.mfa_secret)

    if not totp.verify(payload.code):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid MFA code"
        )

    current_user.mfa_enabled = True

    db.commit()
    db.refresh(current_user)

    return {
        "message": "MFA enabled successfully"
    }

@router.post("/mfa/login", response_model=TokenResponseSchema)
def mfa_login(
    payload: MFALoginSchema,
    db: Session = Depends(get_db)
):
    validate_upc_email(payload.email)

    user = db.query(UserModel).filter(
        UserModel.email == payload.email
    ).first()

    if not user or not verify_password(
        payload.password,
        user.password_hash
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )

    if not user.mfa_enabled or not user.mfa_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA is not enabled for this user"
        )

    totp = pyotp.TOTP(user.mfa_secret)

    if not totp.verify(payload.code):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid MFA code"
        )

    token = create_access_token(
        data={
            "sub": str(user.id),
            "role": user.role.name,
            "email": user.email
        }
    )

    return TokenResponseSchema(
        access_token=token,
        role=user.role.name
    )


@router.post("/mfa/setup-credentials", response_model=MFASetupResponseSchema)
def setup_mfa_credentials(
    payload: MFACredentialsSchema,
    db: Session = Depends(get_db)
):
    """Permite generar el secreto y URI para el código QR de MFA antes de iniciar sesión o durante la vinculación."""
    validate_upc_email(payload.email)
    user = db.query(UserModel).filter(UserModel.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales incorrectas")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cuenta inactiva")

    secret = pyotp.random_base32()
    user.mfa_secret = secret
    db.commit()
    db.refresh(user)

    totp = pyotp.TOTP(secret)
    provisioning_uri = totp.provisioning_uri(
        name=user.email,
        issuer_name="UPC AlumNet"
    )

    return MFASetupResponseSchema(
        secret=secret,
        provisioning_uri=provisioning_uri
    )


@router.post("/mfa/enable-credentials", response_model=TokenResponseSchema)
def enable_mfa_credentials(
    payload: MFALoginSchema,
    db: Session = Depends(get_db)
):
    """Verifica el código TOTP tras escanear el QR con credenciales y activa el MFA iniciando sesión."""
    validate_upc_email(payload.email)
    user = db.query(UserModel).filter(UserModel.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales incorrectas")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cuenta inactiva")
    if not user.mfa_secret:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Primero debes generar el código QR de vinculación")

    totp = pyotp.TOTP(user.mfa_secret)
    if not totp.verify(payload.code):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Código MFA inválido o expirado")

    user.mfa_enabled = True
    db.commit()
    db.refresh(user)

    token = create_access_token(
        data={"sub": str(user.id), "role": user.role.name, "email": user.email}
    )
    return TokenResponseSchema(access_token=token, role=user.role.name)


@router.post("/mfa/disable")
def disable_mfa(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Permite al usuario desactivar el MFA desde su perfil."""
    current_user.mfa_enabled = False
    current_user.mfa_secret = None
    db.commit()
    db.refresh(current_user)
    return {"message": "MFA desactivado correctamente"}

