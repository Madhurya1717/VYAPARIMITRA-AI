import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_complete_voice_journey_telugu(client: AsyncClient):
    """
    Official End-to-End Scenario:
    1. Login to business
    2. Verify 50 kg Rice in stock
    3. Process Telugu voice command: "ఈరోజు 10 కిలోల బియ్యం అమ్మాను"
    4. Verify NLU intent and entity extraction
    5. Execute confirmed transaction
    6. Verify database inventory is deducted to 40 kg
    7. Verify Timbre spoken response audio generation
    8. Verify voice command audit history
    """
    # 1. Login
    login_resp = await client.post("/api/v1/auth/login-json", json={
        "phone_or_email": "demo@vyaparimitra.ai",
        "password": "Vyapari@123"
    })
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Verify Rice is 50 kg
    p_resp = await client.get("/api/v1/products?search=Rice", headers=headers)
    rice = p_resp.json()[0]
    assert rice["current_stock"] == 50.0

    # 3. Preview Telugu Voice Command (execute_transaction=False)
    preview_resp = await client.post(
        "/api/v1/voice/process-command",
        data={
            "transcription_text": "ఈరోజు 10 కిలోల బియ్యం అమ్మాను",
            "language_code": "te-IN",
            "execute_transaction": "false"
        },
        headers=headers
    )
    assert preview_resp.status_code == 200
    p_data = preview_resp.json()
    assert p_data["intent"]["intent"] == "inventory_sale"
    assert p_data["intent"]["quantity"] == 10.0
    assert p_data["intent"]["unit"] == "kg"
    assert "Sona Masoori Rice" in p_data["intent"]["product_name"]
    assert p_data["action_status"] in ["PREVIEW_READY", "CONFIRMATION_REQUIRED"]

    # 4. Confirm and Execute the Transaction (execute_transaction=True)
    exec_resp = await client.post(
        "/api/v1/voice/process-command",
        data={
            "transcription_text": "ఈరోజు 10 కిలోల బియ్యం అమ్మాను",
            "language_code": "te-IN",
            "execute_transaction": "true"
        },
        headers=headers
    )
    assert exec_resp.status_code == 200
    e_data = exec_resp.json()
    assert e_data["action_status"] == "EXECUTED"
    assert e_data["execution_result"]["new_stock"] == 40.0
    assert e_data["spoken_audio_base64"] is not None
    assert "data:audio/wav;base64" in e_data["spoken_audio_base64"]

    # 5. Check Database inventory: stock is now exactly 40.0 kg
    updated_p = await client.get(f"/api/v1/products/{rice['id']}", headers=headers)
    assert updated_p.json()["current_stock"] == 40.0

    # 6. Verify Spoken Text contains Telugu confirmation
    assert "అమ్మకం విజయవంతంగా రికార్డ్ చేయబడింది" in e_data["natural_response"]

    # 7. Check voice command history
    hist_resp = await client.get("/api/v1/voice/history", headers=headers)
    assert hist_resp.status_code == 200
    logs = hist_resp.json()
    assert len(logs) > 0
    assert logs[0]["intent"] == "inventory_sale"

@pytest.mark.asyncio
async def test_voice_command_english(client: AsyncClient):
    login_resp = await client.post("/api/v1/auth/login-json", json={
        "phone_or_email": "demo@vyaparimitra.ai",
        "password": "Vyapari@123"
    })
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    resp = await client.post(
        "/api/v1/voice/process-command",
        data={
            "transcription_text": "I sold 10 kilograms of rice today",
            "language_code": "en-IN",
            "execute_transaction": "true"
        },
        headers=headers
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["intent"]["intent"] == "inventory_sale"
    assert data["intent"]["quantity"] == 10.0
    assert data["action_status"] == "EXECUTED"
    assert "recorded successfully" in data["natural_response"]

@pytest.mark.asyncio
async def test_voice_command_tenglish(client: AsyncClient):
    login_resp = await client.post("/api/v1/auth/login-json", json={
        "phone_or_email": "demo@vyaparimitra.ai",
        "password": "Vyapari@123"
    })
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    resp = await client.post(
        "/api/v1/voice/process-command",
        data={
            "transcription_text": "Today 10 kilos rice sell chesanu",
            "language_code": "te-IN",
            "execute_transaction": "false"
        },
        headers=headers
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["intent"]["intent"] == "inventory_sale"
    assert data["intent"]["quantity"] == 10.0
    assert "Sona Masoori Rice" in data["intent"]["product_name"]

@pytest.mark.asyncio
async def test_voice_stock_inquiry(client: AsyncClient):
    login_resp = await client.post("/api/v1/auth/login-json", json={
        "phone_or_email": "demo@vyaparimitra.ai",
        "password": "Vyapari@123"
    })
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    resp = await client.post(
        "/api/v1/voice/process-command",
        data={
            "transcription_text": "బియ్యం స్టాక్ ఎంత ఉంది?",
            "language_code": "te-IN",
            "execute_transaction": "false"
        },
        headers=headers
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["intent"]["intent"] == "check_stock"
    assert data["action_status"] == "EXECUTED"
    assert "స్టాక్‌లో" in data["natural_response"]
