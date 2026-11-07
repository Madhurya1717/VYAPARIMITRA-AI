# VyapariMitra AI — Quick Start & Setup Guide

This guide walks you through setting up and running VyapariMitra AI locally from scratch in under 3 minutes.

---

## 1. Prerequisites

Make sure the following runtimes are installed on your system:
- **Python:** 3.10 or higher (Tested and fully verified on Python 3.14)
- **Node.js:** v18 or higher (Tested on Node.js v24)
- **npm / npx:** Installed with Node.js

---

## 2. Backend Setup

### Step 2.1: Install Python Dependencies
From the repository root directory (`GnaniAI/`):
```bash
python -m pip install -r backend/requirements.txt
```

### Step 2.2: Configure Environment Variables
Copy `.env.example` to `backend/.env`:
```bash
# On Windows PowerShell
Copy-Item backend/.env.example backend/.env

# On Linux / macOS
cp backend/.env.example backend/.env
```

*(Optional)* If you have an official API key from the Gnani Voice Console (`https://app.gnani.ai/voice`), add it inside `backend/.env`:
```env
GNANI_API_KEY="your_actual_gnani_api_key_here"
```
> **Note:** If left empty, the application automatically activates local simulation mode with pre-recorded test fixtures and valid audio synthesis, allowing full local evaluation without credentials.

### Step 2.3: Run Automated Verification Tests
Verify all 8 automated tests pass:
```bash
python -m pytest backend/tests -v
```

### Step 2.4: Start the FastAPI Backend Server
```bash
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
The API is now live at:
- **API Base:** `http://127.0.0.1:8000`
- **Interactive Swagger Docs:** `http://127.0.0.1:8000/docs`
- **Health Check:** `http://127.0.0.1:8000/health`

---

## 3. Frontend Setup

### Step 3.1: Install Node Dependencies
Open a second terminal window and navigate to the `frontend/` folder:
```bash
cd frontend
npm install
```

### Step 3.2: Launch Vite Development Server
```bash
npm run dev
```
The frontend is now running at:
- **Local URL:** `http://localhost:5173`

---

## 4. Exploring the Demo Application

1. Open your browser and navigate to **`http://localhost:5173`**.
2. Click **"Launch Demo Store"** or navigate to **`/login`**.
3. Click the green **"⚡ 1-Click Quick Demo Login (Kishore Kumar)"** button.
4. You are now inside the **Sri Lakshmi Kirana & General Stores** dashboard!
5. Test the Voice Assistant:
   - Click the floating green microphone icon at the bottom right or open the **Voice Studio** tab.
   - Click the central microphone button and speak in Telugu:
     > *"ఈరోజు 10 కిలోల బియ్యం అమ్మాను"*
   - Or click any of the quick test chips (Telugu, English, Tenglish).
   - Review the extracted intent card, observe the stock deduction from 50 kg to 40 kg, and listen to the spoken audio synthesized via Gnani Timbre!

