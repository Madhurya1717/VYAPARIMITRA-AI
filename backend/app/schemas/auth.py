from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional
from datetime import datetime

class BusinessBase(BaseModel):
    name: str
    owner_name: str
    phone: str
    email: Optional[str] = None
    address: Optional[str] = None
    gstin: Optional[str] = None
    preferred_language: str = "te-IN"
    currency: str = "INR"

class BusinessCreate(BusinessBase):
    pass

class BusinessUpdate(BaseModel):
    name: Optional[str] = None
    owner_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    gstin: Optional[str] = None
    preferred_language: Optional[str] = None

class BusinessResponse(BusinessBase):
    id: str
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

class UserRegister(BaseModel):
    full_name: str
    phone_or_email: str
    password: str
    business_name: str
    preferred_language: str = "te-IN"

class UserLogin(BaseModel):
    phone_or_email: str
    password: str

class LoginStep1Response(BaseModel):
    otp_required: bool = True
    session_token: str
    email_masked: str
    expires_in_seconds: int = 300
    message: str = "A 6-digit verification code has been dispatched to your email."
    dev_otp: Optional[str] = None

class OTPVerifyRequest(BaseModel):
    session_token: str
    otp: str

class OTPResendRequest(BaseModel):
    session_token: str

class OTPResendResponse(BaseModel):
    success: bool
    message: str
    expires_in_seconds: int = 300
    dev_otp: Optional[str] = None

class UserResponse(BaseModel):
    id: str
    business_id: str
    full_name: str
    phone_or_email: str
    role: str
    is_active: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
    business: BusinessResponse
