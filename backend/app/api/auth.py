from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from backend.app.core.database import get_db
from backend.app.core.security import verify_password, get_password_hash, create_access_token, get_current_user, get_current_business
from backend.app.models.business import Business, User
from backend.app.schemas.auth import UserRegister, UserLogin, TokenResponse, UserResponse, BusinessResponse, BusinessUpdate

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=TokenResponse)
async def register(data: UserRegister, db: AsyncSession = Depends(get_db)):
    # Check if user already exists
    existing = await db.execute(select(User).filter(User.phone_or_email == data.phone_or_email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="User with this phone or email already registered")

    # Create new business
    business = Business(
        name=data.business_name,
        owner_name=data.full_name,
        phone=data.phone_or_email,
        preferred_language=data.preferred_language
    )
    db.add(business)
    await db.flush()

    # Create user
    user = User(
        business_id=business.id,
        full_name=data.full_name,
        phone_or_email=data.phone_or_email,
        password_hash=get_password_hash(data.password),
        role="owner",
        is_active=True
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    await db.refresh(business)

    token = create_access_token({"sub": user.id, "business_id": business.id})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user,
        "business": business
    }

@router.post("/login", response_model=TokenResponse)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    identifier = form_data.username.strip()
    result = await db.execute(select(User).filter(User.phone_or_email == identifier))
    user = result.scalar_one_or_none()

    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username/email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Fetch business
    b_res = await db.execute(select(Business).filter(Business.id == user.business_id))
    business = b_res.scalar_one_or_none()

    token = create_access_token({"sub": user.id, "business_id": user.business_id})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user,
        "business": business
    }

@router.post("/login-json", response_model=TokenResponse)
async def login_json(
    data: UserLogin,
    db: AsyncSession = Depends(get_db)
):
    identifier = data.phone_or_email.strip()
    result = await db.execute(select(User).filter(User.phone_or_email == identifier))
    user = result.scalar_one_or_none()

    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username/email or password"
        )

    b_res = await db.execute(select(Business).filter(Business.id == user.business_id))
    business = b_res.scalar_one_or_none()

    token = create_access_token({"sub": user.id, "business_id": user.business_id})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user,
        "business": business
    }

@router.get("/me")
async def get_me(
    current_user: User = Depends(get_current_user),
    current_business: Business = Depends(get_current_business)
):
    return {
        "user": current_user,
        "business": current_business
    }

@router.put("/business", response_model=BusinessResponse)
async def update_business(
    data: BusinessUpdate,
    current_business: Business = Depends(get_current_business),
    db: AsyncSession = Depends(get_db)
):
    if data.name:
        current_business.name = data.name
    if data.owner_name:
        current_business.owner_name = data.owner_name
    if data.phone:
        current_business.phone = data.phone
    if data.email:
        current_business.email = data.email
    if data.address:
        current_business.address = data.address
    if data.gstin:
        current_business.gstin = data.gstin
    if data.preferred_language:
        current_business.preferred_language = data.preferred_language

    await db.commit()
    await db.refresh(current_business)
    return current_business

