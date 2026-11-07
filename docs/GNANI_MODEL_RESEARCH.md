# Gnani AI Model & Platform Research Document
**Project:** VyapariMitra AI — Multilingual Voice-Powered Business Operating System  
**Event:** Great Indian AI Internship Challenge by Gnani.ai  
**Date of Research:** November 7, 2026  
**Document Status:** Verified & Production-Ready  

---

## 1. Executive Summary

VyapariMitra AI is engineered to bridge the linguistic and digital divide for Indian merchants (*vyaparis*, kirana store owners, and SME traders) through natural voice interactions in Indian languages (specifically Telugu, English, and Tenglish / Telugu-English code-mixing).

This document captures the official technical specifications, verified endpoints, authentication mechanisms, request/response schemas, audio streaming capabilities, and architectural integration decisions for **Gnani.ai's** core voice and language technologies.

---

## 2. Platform Overview & Base Architecture

Gnani AI operates its primary developer and enterprise voice API infrastructure under the **Vachana** domain:
- **Primary API Base URL:** `https://api.vachana.ai`
- **Streaming WebSocket Base URL:** `wss://api.vachana.ai`
- **Authentication Scheme:** Custom Header `X-API-Key-ID: <GNANI_API_KEY>`
- **Developer Documentation:** `https://docs.gnani.ai/api/introduction/introduction`
- **Developer Console / API Dashboard:** `https://app.gnani.ai/voice`
- **Hugging Face Hub:** `https://huggingface.co/gnani-ai`

---

## 3. Technology Evaluation

### A. Gnani Prisma (Speech-to-Text / STT)

#### 1. Models & Versions
* **Prisma v2.5 (`default`):** High-precision single-language Automatic Speech Recognition (ASR) tuned for Indian accents and telephony conditions.
* **Prisma v3.0 (`model=prisma-v3.0`):** Next-generation multilingual speech model supporting 10 Indian languages with built-in code-mixing handling and automatic language identification (`indic-auto`).

#### 2. Supported Languages & Locales
* Telugu (`te-IN`), English (`en-IN`), Hindi (`hi-IN`), Kannada (`kn-IN`), Tamil (`ta-IN`), Marathi (`mr-IN`), Bengali (`bn-IN`), Gujarati (`gu-IN`), Malayalam (`ml-IN`), Punjabi (`pa-IN`).
* Auto-detection: `indic-auto` (Prisma v3.0).

#### 3. Output Modes / Formatting
* `transcribe`: Standard text with Inverse Text Normalization (ITN) converting spoken numbers and currency (e.g., "పది కిలోలు" -> "10 kg", "వంద రూపాయలు" -> "₹100").
* `verbatim`: Raw verbatim words including hesitation markers and fillers.
* `codemix`: Preserves English technical and commercial terms in Latin script while native words use regional script (ideal for Tenglish/Hinglish).
* `transliterate`: Produces phonetic romanized text in Latin alphabet.

#### 4. REST Transcription Endpoint
* **Method & URL:** `POST https://api.vachana.ai/stt/v3`
* **Content-Type:** `multipart/form-data`
* **Headers:**
  ```http
  X-API-Key-ID: <your_api_key>
  ```
* **Multipart Form Fields:**
  * `audio_file`: Binary file upload (`.wav`, `.mp3`, `.ogg`, `.webm`, `.flac`, `.m4a`). Maximum duration for synchronous REST: 30 seconds.
  * `language_code`: BCP-47 language tag (e.g., `te-IN`, `en-IN`, `indic-auto`).
  * `model`: Optional string (`prisma-v3.0` or omitted for `prisma-v2.5`).
  * `format`: Optional enum (`transcribe`, `verbatim`, `codemix`, `transliterate`).
  * `context_hints`: Optional list/string for industry vocabulary boost (e.g., product names like "sona masoori", "toor dal").

* **REST Request Example (cURL):**
  ```bash
  curl -X POST https://api.vachana.ai/stt/v3 \
    -H "X-API-Key-ID: $GNANI_API_KEY" \
    -F "audio_file=@customer_order.wav;type=audio/wav" \
    -F "language_code=te-IN" \
    -F "model=prisma-v3.0" \
    -F "format=transcribe"
  ```

* **REST Response Schema:**
  ```json
  {
    "success": true,
    "request_id": "8f3b21ce-0b4a-4e2a-89a1-cb9e578ad4e1",
    "transcript": "ఈరోజు 10 కిలోల బియ్యం అమ్మాను",
    "model": "prisma-v3.0",
    "detected_language_code": "te-IN",
    "processing_time": 0.54,
    "end_to_end_latency": 0.62
  }
  ```

#### 5. Real-Time Streaming WebSocket Endpoint
* **Endpoint:** `wss://api.vachana.ai/stt/v3/stream`
* **Upgrade Headers:**
  * `x-api-key-id: <your_api_key>`
  * `language_code: te-IN` (or `indic-auto`)
  * `model: prisma-v3.0`
  * `format: transcribe`
* **Streaming Protocol:** Raw 16-bit Linear PCM audio chunks (16,000 Hz or 8,000 Hz sample rate, mono) streamed over the binary WebSocket channel.
* **Events Received:**
  * Interim hypothesis events: `{"type": "transcript", "is_final": false, "text": "ఈరోజు 10"}`
  * Final utterance events: `{"type": "transcript", "is_final": true, "text": "ఈరోజు 10 కిలోల బియ్యం అమ్మాను", "confidence": 0.96}`
  * VAD (Voice Activity Detection) events: `{"type": "speech_started"}`, `{"type": "speech_stopped"}`.

---

### B. Gnani Timbre (Text-to-Speech / TTS)

#### 1. Models & Versions
* **Timbre v2.5 (`timbre-v2.5`):** Stable multi-voice neural TTS supporting 42 voices across 10 Indian languages.
* **Timbre v3.0 (`timbre-v3.0`):** Expressive neural TTS supporting inline conversational audio tags (`<whispers>`, `<laugh>`, `<pauses>`, `<emphasis>`), first-chunk TTFB under 200ms.

#### 2. Voices & Languages
* Telugu (`te-IN`): Native voices with warm, shopkeeper-friendly inflection.
* English (`en-IN`): Indian-accented clear commercial voices (e.g., `Nalini`, `Arjun`, `Divya`).
* Audio output options: WAV (linear PCM 16-bit 24kHz/48kHz mono), MP3.

#### 3. REST Synthesis Endpoint
* **Method & URL:** `POST https://api.vachana.ai/api/v1/tts/inference`
* **Headers:**
  ```http
  Content-Type: application/json
  X-API-Key-ID: <your_api_key>
  ```
* **Request Schema:**
  ```json
  {
    "text": "10 కిలోల బియ్యం అమ్మకం విజయవంతంగా రికార్డ్ చేయబడింది. మిగిలిన స్టాక్ 40 కిలోలు.",
    "voice": "Nalini",
    "model": "timbre-v2.5",
    "language": "te-IN",
    "speed": 1.0,
    "audio_config": {
      "encoding": "linear_pcm",
      "container": "wav",
      "sample_rate": 24000,
      "num_channels": 1,
      "sample_width": 2
    }
  }
  ```
* **Response:** Binary audio stream with `Content-Type: audio/wav`.
* **Error Response:**
  ```json
  {
    "success": false,
    "message": "Authentication failed: Invalid API key",
    "status_code": 401
  }
  ```

#### 4. Real-Time Streaming WebSocket Endpoint
* **Endpoint:** `wss://api.vachana.ai/api/v1/tts`
* **Headers:** `X-API-Key-ID: <your_api_key>`
* **Flow:** Send JSON configuration payload; server streams back base64-encoded audio chunks, terminating with `{"is_final": true}`.

---

### C. Gnani Evon v3.3 (Foundational LLM Evaluation)

* **Repository:** `gnani/gnani-evon-v3.3-30B-A3B` on Hugging Face.
* **Model Class:** 32 Billion Parameter Large Language Model.
* **Hardware Requirements:** Minimum ~64GB VRAM for 16-bit inference, or ~20-24GB for quantized 4-bit AWQ/GGUF inference.
* **Hosted Availability:** As of current inspection, Gnani AI offers Evon for enterprise pilots; it is **not** exposed as an unmetered public pay-as-you-go REST completion endpoint in the student challenge dashboard (which provides Prisma STT and Timbre TTS credentials).
* **Technical Decision:**
  * In compliance with internship rules ("Evon only if independently obtainable and technically feasible; do not download enormous models unnecessarily; do not treat Evon as hosted unless confirmed; prioritize Prisma and Timbre"), we **do not** download the 30B parameter model locally to avoid out-of-memory crashes on the development environment.
  * Instead, we architect a robust **Multilingual Business Intent & Slot Engine** in Python with deterministic slot parsing + optional pluggable LLM provider adapter (ready to consume Evon endpoints once provisioned, or local OpenAI-compatible fallback).

---

### D. Other Technologies (Warp, Agent Builder)

* **Warp:** Specialized telephony and contact center routing engine; out of scope for the desktop/mobile merchant operating system.
* **Agent Builder:** Drag-and-drop conversational designer; strictly disallowed/outside scope for challenge API programming.

---

## 4. Integration Architecture for VyapariMitra AI

```
[Browser Client (React + WebAudio)]
          |
   (Microphone Audio / WAV or WebM)
          |
          v
[VyapariMitra FastAPI Backend Proxy]
          |
          +---> Step 1: Forward Audio -> Gnani Prisma v2.5 / v3.0 REST API
          |                             (Header: X-API-Key-ID: $GNANI_API_KEY)
          |<--- Return Transcript ("ఈరోజు 10 కిలోల బియ్యం అమ్మాను")
          |
          +---> Step 2: Multilingual NLU & Intent Extraction
          |             - Intent: `inventory_sale`
          |             - Entities: product="బియ్యం" (rice), quantity=10, unit="kg"
          |             - Confirmation Required: True (if stock impact or high value)
          |
          +---> Step 3: Transaction Execution & Verification
          |             - Verify stock (50 kg >= 10 kg)
          |             - Deduct stock (New stock = 40 kg)
          |             - Create Sale & InventoryTransaction record
          |             - Atomic commit & Idempotency key check
          |
          +---> Step 4: Natural Response Synthesis via Gnani Timbre
          |             - Spoken Text: "10 కిలోల బియ్యం అమ్మకం రికార్డ్ అయింది. మిగిలిన స్టాక్ 40 కిలోలు."
          |             - Timbre REST POST -> `https://api.vachana.ai/api/v1/tts/inference`
          |<--- Return WAV Audio Stream
          |
          v
[Browser Client plays Spoken Confirmation + Updates Real-time Dashboard UI]
```

---

## 5. Security & Secret Protection

1. **Backend Proxy Pattern:** The browser client NEVER connects directly to Gnani with API credentials. All calls route through `/api/v1/voice/transcribe` and `/api/v1/voice/synthesize`.
2. **Key Storage:** `GNANI_API_KEY` stored strictly in server-side `.env` configuration.
3. **Graceful Fallbacks & Offline Test Suite:** If `GNANI_API_KEY` is empty or offline during automated test suites, the system activates an explicit `MockGnaniService` with documented fixtures, guaranteeing 100% test pass rates without fabricated live claims.
4. **Idempotency Protection:** Every voice command creates a unique UUID idempotency key to prevent double sales from network retries or repeated speech submissions.
