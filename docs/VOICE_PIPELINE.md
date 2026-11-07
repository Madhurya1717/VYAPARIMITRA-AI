# Voice AI Processing Pipeline
**Project:** VyapariMitra AI  
**Technologies:** Gnani Prisma (STT), Gnani Timbre (TTS), Multilingual NLU Slot Filler  

---

## 1. Architectural Voice Flow

```
+-----------------------------------------------------------------------------------+
| 1. IN-BROWSER MICROPHONE CAPTURE                                                  |
|    - MediaRecorder / Web Audio AudioContext                                       |
|    - Sample Rate: 16,000 Hz, Mono, Linear PCM                                     |
|    - Live FFT Frequency Analysis for animated real-time UI waveform               |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| 2. BACKEND SECURE GATEWAY (`/api/v1/voice/process-command`)                       |
|    - Audio size and duration validation (< 10 MB, <= 30 seconds)                  |
|    - Header injection: X-API-Key-ID: $GNANI_API_KEY (browser never sees key)      |
|    - Idempotency key registration (protects against repeated voice triggers)      |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| 3. GNANI PRISMA STT TRANSCRIPTION (`https://api.vachana.ai/stt/v3`)              |
|    - Model: Prisma v3.0 (or v2.5 fallback)                                        |
|    - Language: `te-IN`, `en-IN`, or `indic-auto`                                  |
|    - Output format: `transcribe` with Inverse Text Normalization (ITN)            |
|    - Obtains transcript: "ఈరోజు 10 కిలోల బియ్యం అమ్మాను"                         |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| 4. MULTILINGUAL BUSINESS INTENT & SLOT FILLING ENGINE                             |
|    - Language identification (Telugu vs English vs Code-mixed Tenglish)           |
|    - Intent classification: `inventory_sale`, `inventory_add`, `check_stock`,    |
|      `price_inquiry`, `daily_summary`                                             |
|    - Entity slot extraction:                                                      |
|      * Product: Match against catalog names, Telugu titles, and aliases           |
|      * Quantity: Numeric digits (10) or spoken words (పది, యాభై, fifty)           |
|      * Unit: Standardized to kg, litre, packet, piece, bag                        |
|    - Confidence calculation & confirmation threshold evaluation                   |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| 5. BUSINESS LOGIC & LEDGER TRANSACTION EXECUTION                                  |
|    - Stock verification: Is current_stock >= requested quantity?                 |
|    - If Insufficient: Rejects transaction safely without modifying database       |
|    - If Confirmed / Approved:                                                     |
|      * Atomically updates product current_stock                                   |
|      * Generates itemized Sale record with Decimal arithmetic                     |
|      * Writes immutable audit entry into `inventory_transactions` ledger          |
|      * Generates Bharat UPI payment QR code for the customer                      |
|      * Evaluates low-stock threshold; triggers notification if stock drops low    |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| 6. NATURAL RESPONSE GENERATION & GNANI TIMBRE TTS                                 |
|    - Natural spoken text generated in matching language:                          |
|      "10.0 kg Sona Masoori Rice అమ్మకం విజయవంతంగా రికార్డ్ చేయబడింది..."        |
|    - POST to `https://api.vachana.ai/api/v1/tts/inference`                        |
|    - Voice: `Nalini`, Model: `timbre-v2.5`, Audio Config: 24kHz Linear PCM WAV    |
|    - Returns binary audio stream encoded as Base64 data URL                       |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| 7. CLIENT PRESENTATION & REAL-TIME AUDIO PLAYBACK                                 |
|    - HTML5 AudioElement plays natural spoken confirmation                         |
|    - ActionPreviewCard renders structured summary                                 |
|    - Dashboard metrics, inventory balances, and charts refresh dynamically        |
+-----------------------------------------------------------------------------------+
```

---

## 2. Multilingual Intelligence Matrix

| Language | Test Spoken Input | Extracted Intent | Extracted Entities | Natural Spoken Confirmation |
|---|---|---|---|---|
| **Pure Telugu** | `"ఈరోజు 10 కిలోల బియ్యం అమ్మాను"` | `inventory_sale` | Product: Sona Masoori Rice<br>Qty: 10<br>Unit: kg | `"10.0 kg Sona Masoori Rice అమ్మకం విజయవంతంగా రికార్డ్ చేయబడింది. మొత్తం విలువ ₹560.00. మిగిలిన స్టాక్ 40.0 kg."` |
| **Indian English** | `"I sold 10 kilograms of rice today"` | `inventory_sale` | Product: Sona Masoori Rice<br>Qty: 10<br>Unit: kg | `"Sale of 10.0 kg of Sona Masoori Rice recorded successfully. Total amount ₹560.00. Remaining stock is 40.0 kg."` |
| **Tenglish (Code-Mixed)** | `"Today 10 kilos rice sell chesanu"` | `inventory_sale` | Product: Sona Masoori Rice<br>Qty: 10<br>Unit: kg | `"10.0 kg Sona Masoori Rice అమ్మకం విజయవంతంగా రికార్డ్ చేయబడింది. మొత్తం విలువ ₹560.00. మిగిలిన స్టాక్ 40.0 kg."` |
| **Stock Inquiry** | `"బియ్యం స్టాక్ ఎంత ఉంది?"` | `check_stock` | Product: Sona Masoori Rice | `"ప్రస్తుతం స్టాక్‌లో 40.0 kg Sona Masoori Rice అందుబాటులో ఉంది."` |
| **Restock Action** | `"స్టాక్ లో 50 కిలోల కందిపప్పు చేర్చండి"` | `inventory_add` | Product: Toor Dal<br>Qty: 50<br>Unit: kg | `"50.0 kg Toor Dal స్టాక్‌లో విజయవంతంగా చేర్చబడింది. ప్రస్తుత నిల్వ: 85.0 kg."` |
| **Daily Summary** | `"ఈరోజు అమ్మకాలు ఎంత?"` | `daily_summary` | None | `"ఈరోజు మొత్తం 4 లావాదేవీలలో ₹2,320.00 అమ్మకాలు జరిగాయి."` |

---

## 3. Idempotency & Financial Protection

1. **Idempotency Key Verification:** Every command carries an `idempotency_key` (UUID). If network retransmission occurs or a user repeatedly clicks without reloading, duplicate billing is strictly prevented.
2. **Deficit Safeguard:** If an utterance specifies `100 kg` when only `40 kg` is physically in stock, the engine rejects the transaction, generates an error audio feedback, and commits zero database mutations.
3. **High Quantity Confirmation Gate:** Any sale exceeding 25 units or ₹2,000 automatically triggers `requires_confirmation = true`, displaying a mandatory confirmation button before writing to the database.
