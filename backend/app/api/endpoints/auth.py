import pyotp
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.db.connection import get_db
from app.db.models import UserModel, RoleModel
from app.schemas.schemas import (
    UserCreateSchema,
    UserResponseSchema,
    TokenResponseSchema,
    MFASetupResponseSchema,
    MFAVerifySchema,
    MFALoginSchema,
    UserProfileSchema
)
from app.core.security import hash_password, verify_password, create_access_token
from app.api.deps import get_current_user

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponseSchema, status_code=status.HTTP_201_CREATED)
def register(payload: UserCreateSchema, db: Session = Depends(get_db)):
    """Registra un nuevo usuario (Student, Alumni o Administrator) con contraseña hasheada en Argon2id."""
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
    user = db.query(UserModel).filter(UserModel.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is inactive")
    if user.mfa_enabled:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,detail="MFA required")
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
