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
async def test_user_registration_and_login(client: AsyncClient):
    # Register new merchant
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

    # Login with JSON
    login_resp = await client.post("/api/v1/auth/login-json", json={
        "phone_or_email": "raviteja@kiranastore.com",
        "password": "Password@123"
    })
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]

    # Verify protected /me endpoint
    me_resp = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_resp.status_code == 200
    assert me_resp.json()["user"]["phone_or_email"] == "raviteja@kiranastore.com"

