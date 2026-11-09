from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from backend.app.core.database import get_db
from backend.app.core.config import settings
from backend.app.core.security import verify_password, get_password_hash, create_access_token, get_current_user, get_current_business
from backend.app.models.business import Business, User, OTPVerification
from backend.app.schemas.auth import (
    UserRegister, UserLogin, TokenResponse, UserResponse,
    BusinessResponse, BusinessUpdate, LoginStep1Response,
    OTPVerifyRequest, OTPResendRequest, OTPResendResponse
)
from backend.app.services.email_service import email_service

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

@router.post("/login-json", response_model=LoginStep1Response)
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

    # Invalidate any prior unused OTP requests for this user
    existing_otps = await db.execute(
        select(OTPVerification).filter(OTPVerification.user_id == user.id, OTPVerification.is_used == False)
    )
    for old_otp in existing_otps.scalars().all():
        old_otp.is_used = True

    # Generate cryptographically secure 6-digit OTP & session token
    otp = email_service.generate_otp()
    session_token = email_service.generate_session_token()
    otp_hash = email_service.hash_otp(session_token, otp)

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    expires_at = now + timedelta(minutes=5)

    otp_record = OTPVerification(
        user_id=user.id,
        session_token=session_token,
        otp_hash=otp_hash,
        attempts=0,
        expires_at=expires_at,
        last_resend_at=now,
        is_used=False
    )
    db.add(otp_record)
    await db.commit()

    # Dispatch OTP via configured SMTP or Development Console
    await email_service.send_login_otp(user.phone_or_email, user.full_name, otp)

    is_dev = (settings.ENVIRONMENT != "production") or not (settings.SMTP_HOST and settings.SMTP_USER)

    return {
        "otp_required": True,
        "session_token": session_token,
        "email_masked": email_service.mask_email(user.phone_or_email),
        "expires_in_seconds": 300,
        "message": "A 6-digit verification code has been dispatched to your email.",
        "dev_otp": otp if is_dev else None
    }

@router.post("/verify-otp", response_model=TokenResponse)
async def verify_otp(
    data: OTPVerifyRequest,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(OTPVerification).filter(OTPVerification.session_token == data.session_token)
    )
    otp_record = result.scalar_one_or_none()

    if not otp_record:
        raise HTTPException(status_code=400, detail="Invalid verification session. Please log in again.")

    if otp_record.is_used:
        raise HTTPException(status_code=400, detail="This verification code has already been used. Please log in again.")

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    if now > otp_record.expires_at:
        raise HTTPException(status_code=400, detail="Verification code has expired. Please request a new code.")

    if otp_record.attempts >= 5:
        raise HTTPException(status_code=400, detail="Maximum verification attempts exceeded. Please initiate a new login.")

    # Constant-time comparison
    is_valid = email_service.verify_otp(data.session_token, data.otp.strip(), otp_record.otp_hash)
    if not is_valid:
        otp_record.attempts += 1
        await db.commit()
        remaining = max(0, 5 - otp_record.attempts)
        raise HTTPException(status_code=400, detail=f"Invalid verification code. {remaining} attempt(s) remaining.")

    # Successful verification
    otp_record.is_used = True
    await db.commit()

    user_res = await db.execute(select(User).filter(User.id == otp_record.user_id))
    user = user_res.scalar_one()

    b_res = await db.execute(select(Business).filter(Business.id == user.business_id))
    business = b_res.scalar_one()

    token = create_access_token({"sub": user.id, "business_id": user.business_id})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user,
        "business": business
    }

@router.post("/resend-otp", response_model=OTPResendResponse)
async def resend_otp(
    data: OTPResendRequest,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(OTPVerification).filter(OTPVerification.session_token == data.session_token)
    )
    otp_record = result.scalar_one_or_none()

    if not otp_record or otp_record.is_used:
        raise HTTPException(status_code=400, detail="Session expired or invalid. Please log in again.")

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    elapsed_seconds = (now - otp_record.last_resend_at).total_seconds()
    if elapsed_seconds < 60:
        cooldown_left = int(60 - elapsed_seconds)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Please wait {cooldown_left} seconds before requesting a new code."
        )

    # Generate new OTP
    new_otp = email_service.generate_otp()
    otp_record.otp_hash = email_service.hash_otp(otp_record.session_token, new_otp)
    otp_record.expires_at = now + timedelta(minutes=5)
    otp_record.last_resend_at = now
    otp_record.attempts = 0
    await db.commit()

    user_res = await db.execute(select(User).filter(User.id == otp_record.user_id))
    user = user_res.scalar_one()

    await email_service.send_login_otp(user.phone_or_email, user.full_name, new_otp)

    is_dev = (settings.ENVIRONMENT != "production") or not (settings.SMTP_HOST and settings.SMTP_USER)

    return {
        "success": True,
        "message": "A new 6-digit verification code has been dispatched.",
        "expires_in_seconds": 300,
        "dev_otp": new_otp if is_dev else None
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

