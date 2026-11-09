import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_health_check(client: AsyncClient):
    resp = await client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "healthy"
    assert "gnani_stt_endpoint" in data
    assert "supported_languages" in data

@pytest.mark.asyncio
async def test_user_registration_and_two_step_login(client: AsyncClient):
    # 1. Register new merchant
    reg_payload = {
        "full_name": "Ravi Teja",
        "phone_or_email": "raviteja@kiranastore.com",
        "password": "Password@123",
        "business_name": "Teja Provisions",
        "preferred_language": "te-IN"
    }
    reg_resp = await client.post("/api/v1/auth/register", json=reg_payload)
    assert reg_resp.status_code == 200
    reg_data = reg_resp.json()
    assert "access_token" in reg_data
    assert reg_data["user"]["full_name"] == "Ravi Teja"
    assert reg_data["business"]["name"] == "Teja Provisions"

    # 2. Step 1: Login with JSON (Triggers OTP generation)
    login_resp = await client.post("/api/v1/auth/login-json", json={
        "phone_or_email": "raviteja@kiranastore.com",
        "password": "Password@123"
    })
    assert login_resp.status_code == 200
    step1_data = login_resp.json()
    assert step1_data["otp_required"] is True
    assert "session_token" in step1_data
    assert "dev_otp" in step1_data
    assert step1_data["dev_otp"] is not None
    session_token = step1_data["session_token"]
    otp = step1_data["dev_otp"]

    # 3. Step 2a: Test Invalid OTP rejection
    bad_verify = await client.post("/api/v1/auth/verify-otp", json={
        "session_token": session_token,
        "otp": "000000"
    })
    assert bad_verify.status_code == 400
    assert "Invalid verification code" in bad_verify.json()["detail"]

    # 4. Step 2b: Test Valid OTP verification
    good_verify = await client.post("/api/v1/auth/verify-otp", json={
        "session_token": session_token,
        "otp": otp
    })
    assert good_verify.status_code == 200
    token_data = good_verify.json()
    assert "access_token" in token_data
    token = token_data["access_token"]

    # 5. Verify protected /me endpoint with received JWT
    me_resp = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_resp.status_code == 200
    assert me_resp.json()["user"]["phone_or_email"] == "raviteja@kiranastore.com"

@pytest.mark.asyncio
async def test_resend_otp_and_cooldown(client: AsyncClient):
    # Register merchant
    reg_payload = {
        "full_name": "Suresh Reddy",
        "phone_or_email": "suresh@reddygeneral.com",
        "password": "Password@123",
        "business_name": "Reddy General Store",
        "preferred_language": "te-IN"
    }
    await client.post("/api/v1/auth/register", json=reg_payload)

    # Step 1
    login_resp = await client.post("/api/v1/auth/login-json", json={
        "phone_or_email": "suresh@reddygeneral.com",
        "password": "Password@123"
    })
    session_token = login_resp.json()["session_token"]

    # Resend immediately should fail due to 60s cooldown
    resend_fail = await client.post("/api/v1/auth/resend-otp", json={
        "session_token": session_token
    })
    assert resend_fail.status_code == 429
    assert "Please wait" in resend_fail.json()["detail"]
