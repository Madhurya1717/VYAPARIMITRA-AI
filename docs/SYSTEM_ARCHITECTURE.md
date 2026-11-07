# System Architecture Document
**Project:** VyapariMitra AI — Multilingual Voice-Powered Business Operating System  
**Version:** 1.0.0  
**Target Environment:** Python 3.14+ (Backend), Node 24+ (Frontend), SQLite/PostgreSQL  

---

## 1. Architectural Philosophy

VyapariMitra AI is constructed on four foundational pillars:
1. **Linguistic Accessibility for Bharat:** Seamless real-time understanding of Telugu, Indian English, and colloquial Tenglish so merchants can run their store without typing.
2. **Deterministic Transaction Integrity:** Voice inputs are non-deterministic; financial and inventory modifications MUST be 100% deterministic, atomic, and idempotent.
3. **Enterprise Multitenancy & Data Isolation:** Complete logical tenant separation by `business_id` across all queries, models, and operations.
4. **Resilient AI Pipeline:** Transparent backend proxying of Gnani Prisma STT and Timbre TTS with robust circuit breaking, fallback modes, and audio format transformation.

---

## 2. High-Level Architecture Diagram

```
+-----------------------------------------------------------------------------------+
|                              CLIENT LAYER (Browser / PWA)                         |
|                                                                                   |
|  +--------------------+   +---------------------+   +--------------------------+  |
|  |  React 18 + Vite   |   |   Tailwind CSS UI   |   | Web Audio MediaRecorder  |  |
|  |  TypeScript Engine |   |  Dark Navy / Emerald|   | Live Audio Capture & VAD |  |
|  +--------------------+   +---------------------+   +--------------------------+  |
|            |                         |                           |                |
|            +-------------------------+---------------------------+                |
+--------------------------------------|--------------------------------------------+
                                       | HTTPS / WSS
                                       v
+-----------------------------------------------------------------------------------+
|                             BACKEND API GATEWAY (FastAPI)                         |
|                                                                                   |
|  +-------------------+  +-------------------+  +-------------------------------+  |
|  | JWT & Multi-Tenant|  | Rate Limiter &    |  | Idempotency Key Validator     |  |
|  | Auth Middleware   |  | CORS Policy       |  | (UUID dedup cache)            |  |
|  +-------------------+  +-------------------+  +-------------------------------+  |
|                                       |                                           |
|       +-------------------------------+-------------------------------+           |
|       |                               |                               |           |
|       v                               v                               v           |
|  +-------------------+       +-------------------+       +---------------------+  |
|  | Business Services |       | Voice AI Engine   |       | Business Analytics  |  |
|  | - Products & Stock|       | - Audio Validator |       | - Daily/Weekly P&L  |  |
|  | - Sales & Billing |       | - Multilingual NLU|       | - Low-stock alerts  |  |
|  | - Order Lifecycles|       | - Entity Extractor|       | - Synthetic trends  |  |
|  | - Ledger & Audit  |       | - Slot Normalizer |       |                     |  |
|  +-------------------+       +-------------------+       +---------------------+  |
|            |                          |                             |             |
+------------|--------------------------|-----------------------------|-------------+
             |                          |                             |
             v                          v                             v
+------------------------+  +------------------------+  +---------------------------+
|    PERSISTENCE LAYER   |  |    GNANI AI CLOUD      |  |     CLIENT FEEDBACK       |
|                        |  |                        |  |                           |
|  - PostgreSQL / SQLite |  |  - Gnani Prisma v2.5/3 |  |  - Audio Output (Timbre)  |
|  - SQLAlchemy 2.0 Async|  |    (REST + WebSocket)  |  |  - Realtime UI updates    |
|  - Foreign Key Rel.    |  |  - Gnani Timbre v2.5/3 |  |  - Audit Log Trail        |
|  - Tenant-level Scopes |  |    (Neural Indian TTS) |  |  - Action Confirmation    |
+------------------------+  +------------------------+  +---------------------------+
```

---

## 3. Core Subsystems

### 3.1. Voice Processing Pipeline
1. **Audio Capture:** In-browser 16kHz mono audio recording via `MediaRecorder` or `AudioWorklet`, outputting WAV/WebM.
2. **Audio Gateway (`/api/v1/voice/transcribe-and-execute`):** 
   - Validates audio chunk length (max 30s) and format.
   - Forwards audio to Gnani Prisma API (`https://api.vachana.ai/stt/v3`) using server-side secure `X-API-Key-ID`.
   - Obtains official transcription and detected language.
3. **Multilingual NLU Engine:**
   - Detects intent: `inventory_sale`, `inventory_add`, `check_stock`, `create_order`, `daily_summary`, `price_inquiry`.
   - Extracts slots: product name (Telugu/English transliterated aliases), numeric quantity, unit (kg, litres, packets, pieces), price/amount.
   - Computes intent confidence and evaluates whether explicit merchant confirmation is required (e.g. destructive actions, ambiguous product names).
4. **Execution & Synthesis:**
   - Executes atomic SQL transaction (deducts stock, registers sale).
   - Generates natural, respectful multilingual response.
   - Synthesizes response audio via Gnani Timbre API (`https://api.vachana.ai/api/v1/tts/inference`).
   - Returns structured JSON + audio URL/base64 to the frontend.

### 3.2. Multitenancy & Data Isolation Model
- Every business has a unique `business_id` UUID.
- Every authenticated user belongs to a `business_id`.
- Every SQL query on products, inventory, sales, customers, and orders is automatically scoped with `WHERE business_id = current_user.business_id`.
- Cross-tenant access is structurally impossible at the repository and ORM layer.

### 3.3. Idempotency & Financial Safety
- Double sales due to network retries or accidental repeat voice utterances are rejected using an `idempotency_key` (hash of user id + command timestamp or explicit UUID).
- Decimal arithmetic via Python `Decimal` is enforced for all currency calculations, ensuring zero floating-point drift.

