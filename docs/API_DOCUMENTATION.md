# REST & Voice API Documentation
**Project:** VyapariMitra AI  
**Base URL:** `http://localhost:8000/api/v1`  
**Authentication Scheme:** HTTP Bearer JWT Token (`Authorization: Bearer <TOKEN>`)  
**AI Engines:** Gnani Prisma v2.5/3.0 (STT) & Gnani Timbre v2.5/3.0 (TTS)  

---

## 1. Authentication Endpoints (`/auth`)

### 1.1. Register Merchant Store
- **Route:** `POST /api/v1/auth/register`
- **Request Body (JSON):**
  ```json
  {
    "full_name": "Kishore Kumar",
    "phone_or_email": "demo@vyaparimitra.ai",
    "password": "Vyapari@123",
    "business_name": "Sri Lakshmi Kirana & General Stores",
    "preferred_language": "te-IN"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "bearer",
    "user": {
      "id": "u-uuid-1",
      "business_id": "b-uuid-1",
      "full_name": "Kishore Kumar",
      "phone_or_email": "demo@vyaparimitra.ai",
      "role": "owner",
      "is_active": true,
      "created_at": "2026-11-07T09:50:00Z"
    },
    "business": {
      "id": "b-uuid-1",
      "name": "Sri Lakshmi Kirana & General Stores",
      "preferred_language": "te-IN",
      "currency": "INR"
    }
  }
  ```

### 1.2. JSON Login
- **Route:** `POST /api/v1/auth/login-json`
- **Request Body (JSON):**
  ```json
  {
    "phone_or_email": "demo@vyaparimitra.ai",
    "password": "Vyapari@123"
  }
  ```
- **Response (200 OK):** Returns `access_token`, `user`, and `business` objects.

### 1.3. Get Current Profile
- **Route:** `GET /api/v1/auth/me`
- **Headers:** `Authorization: Bearer <TOKEN>`
- **Response (200 OK):** Returns active user and scoped business profile.

---

## 2. Voice AI Endpoints (`/voice`)

### 2.1. Process Multilingual Voice Command (Core Hero Endpoint)
- **Route:** `POST /api/v1/voice/process-command`
- **Headers:** `Authorization: Bearer <TOKEN>`
- **Content-Type:** `multipart/form-data`
- **Form Fields:**
  - `audio_file`: (Optional UploadFile) Binary WAV / WebM microphone audio.
  - `transcription_text`: (Optional String) Pre-transcribed or typed command string.
  - `language_code`: (Optional String, default: `te-IN`) e.g. `te-IN`, `en-IN`, `indic-auto`.
  - `execute_transaction`: (Boolean, default: `false`) 
    - When `false`: Returns structured preview & confirmation requirement without mutating DB.
    - When `true`: Atomically executes the transaction, deducts inventory, creates sale/restock ledger record, and synthesizes spoken confirmation.
  - `idempotency_key`: (Optional String) Unique UUID to protect against repeat submissions.

- **Response (200 OK):**
  ```json
  {
    "command_id": "7a3c8e12-45f8-4e8c-b3a1-79bc21345678",
    "transcription": "ఈరోజు 10 కిలోల బియ్యం అమ్మాను",
    "detected_language": "te-IN",
    "intent": {
      "intent": "inventory_sale",
      "product_name": "Sona Masoori Rice",
      "matched_product_id": "prod-rice-001",
      "quantity": 10.0,
      "unit": "kg",
      "unit_price": 56.0,
      "total_amount": 560.0,
      "language": "te",
      "confidence": 0.96,
      "requires_confirmation": false
    },
    "action_status": "EXECUTED",
    "natural_response": "10.0 kg Sona Masoori Rice అమ్మకం విజయవంతంగా రికార్డ్ చేయబడింది. మొత్తం విలువ ₹560.00. మిగిలిన స్టాక్ 40.0 kg.",
    "spoken_audio_url": null,
    "spoken_audio_base64": "data:audio/wav;base64,UklGRi4AAABXQVZFZm10IBAAAAABAAEA...",
    "execution_result": {
      "sale_id": "s-1234",
      "invoice_number": "INV-20261107-A9F1C2",
      "product_id": "prod-rice-001",
      "product_name": "Sona Masoori Rice",
      "quantity_sold": 10.0,
      "unit": "kg",
      "total_amount": 560.0,
      "new_stock": 40.0
    },
    "latency_ms": 142.8,
    "model_info": {
      "stt_engine": "Gnani Prisma (prisma-v3.0)",
      "tts_engine": "Gnani Timbre (timbre-v2.5)",
      "voice": "Nalini",
      "live_gnani_stt": "true",
      "live_gnani_tts": "true"
    }
  }
  ```

### 2.2. Direct Speech-to-Text Transcription Proxy
- **Route:** `POST /api/v1/voice/transcribe`
- **Description:** Forwards audio directly to Gnani Prisma STT (`https://api.vachana.ai/stt/v3`).
- **Form Fields:** `audio_file` (WAV/MP3), `language_code` (`te-IN`, `en-IN`, `indic-auto`), `model` (`prisma-v3.0`).

### 2.3. Direct Text-to-Speech Synthesis Proxy
- **Route:** `POST /api/v1/voice/synthesize`
- **Description:** Forwards text directly to Gnani Timbre TTS (`https://api.vachana.ai/api/v1/tts/inference`).
- **Response:** Raw binary `audio/wav` audio stream.

### 2.4. Voice Command Audit History
- **Route:** `GET /api/v1/voice/history`
- **Response:** Array of past voice commands, transcribed utterances, confidence scores, latencies, and transaction execution results.

---

## 3. Inventory & Product Endpoints (`/products`)

### 3.1. List Products
- **Route:** `GET /api/v1/products`
- **Query Params:** `category_id`, `search`, `low_stock_only=true`
- **Response:** Array of catalog products with current stock, unit, cost/selling price, and low-stock warning flag.

### 3.2. Create Product
- **Route:** `POST /api/v1/products`
- **Request Body (JSON):**
  ```json
  {
    "name": "Toor Dal",
    "telugu_name": "కందిపప్పు",
    "aliases": ["toor dal", "kandi pappu", "dal", "పప్పు"],
    "current_stock": 35.0,
    "unit": "kg",
    "cost_price": 130.0,
    "selling_price": 155.0,
    "low_stock_threshold": 10.0
  }
  ```

### 3.3. Adjust Stock Balance
- **Route:** `POST /api/v1/products/{id}/adjust-stock`
- **Request Body (JSON):**
  ```json
  {
    "product_id": "{id}",
    "type": "IN",
    "quantity": 25.0,
    "notes": "Direct vendor delivery"
  }
  ```

### 3.4. Inventory Audit Ledger
- **Route:** `GET /api/v1/products/transactions`
- **Response:** Immutable ledger records with timestamp, quantity change, and snapshot balance after transaction.

---

## 4. Sales & Billing Endpoints (`/sales`)

### 4.1. Create Multi-Item Sale
- **Route:** `POST /api/v1/sales`
- **Request Body (JSON):**
  ```json
  {
    "customer_id": "cust-uuid-1",
    "items": [
      { "product_id": "prod-rice-001", "quantity": 10.0, "unit_price": 56.0 }
    ],
    "discount_amount": 0.0,
    "tax_amount": 0.0,
    "payment_method": "upi",
    "idempotency_key": "unique-trans-uuid-99"
  }
  ```
- **Response:** Sale object with itemized line totals and invoice with generated `qr_payload` (`upi://pay?pa=...`).

### 4.2. List Sales History
- **Route:** `GET /api/v1/sales?limit=50`

---

## 5. Analytics & Dashboard Endpoints (`/analytics`)

### 5.1. Dashboard Summary
- **Route:** `GET /api/v1/analytics/dashboard`
- **Response:** Real metrics aggregated from SQL tables:
  - `today_sales`, `today_orders`
  - `total_revenue`, `total_orders_count`
  - `inventory_total_value`, `active_products_count`, `low_stock_count`
  - `low_stock_items` (with heuristic deficit & suggested purchase reorder quantities)
  - `top_selling_products`
  - `recent_sales_trend` (last 7 days actual revenue per day)
  - `category_distribution`

