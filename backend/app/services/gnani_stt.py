import os
import shutil
import subprocess
import logging
import httpx
from typing import Dict, Any, Optional
from backend.app.core.config import settings

logger = logging.getLogger(__name__)

SUPPORTED_STT_LANGUAGES = {
    "te-IN", "en-IN", "indic-auto", "hi-IN", "ta-IN",
    "kn-IN", "ml-IN", "mr-IN", "bn-IN", "gu-IN", "pa-IN", "as-IN"
}

def normalize_stt_language(lang_code: Optional[str]) -> str:
    """
    Normalizes any input language code to a valid, supported Gnani Prisma STT code.
    Maps:
      - 'te-en', 'tenglish', 'code-mixed', 'auto', 'indic-auto' -> 'indic-auto'
      - 'te', 'te-in', 'telugu' -> 'te-IN'
      - 'en', 'en-in', 'english' -> 'en-IN'
      - 'hi', 'hi-in', 'hindi' -> 'hi-IN'
    Falls back to 'indic-auto' for unknown or code-mixed Indic speech.
    Guarantees invalid custom codes like 'te-en' are NEVER sent to Gnani API.
    """
    if not lang_code:
        return "indic-auto"

    clean = lang_code.strip().lower().replace("_", "-")

    if clean in ("te-en", "tenglish", "code-mixed", "mixed", "auto", "indic-auto"):
        return "indic-auto"
    elif clean in ("te", "te-in", "telugu"):
        return "te-IN"
    elif clean in ("en", "en-in", "english"):
        return "en-IN"
    elif clean in ("hi", "hi-in", "hindi"):
        return "hi-IN"

    for sup in SUPPORTED_STT_LANGUAGES:
        if clean == sup.lower():
            return sup

    # Default safe fallback for multilingual kirana speech
    return "indic-auto"

class GnaniPrismaSTTService:
    """
    Official Client Integration for Gnani Prisma Speech-to-Text.
    Supports Prisma v2.5 and Prisma v3.0 via REST POST https://api.vachana.ai/stt/v3.
    """

    def __init__(self):
        self.endpoint = settings.GNANI_STT_ENDPOINT
        self.default_model = settings.GNANI_STT_DEFAULT_MODEL
        self.default_lang = settings.GNANI_STT_DEFAULT_LANG

    @property
    def api_key(self) -> str:
        return settings.GNANI_API_KEY

    def _normalize_audio_to_wav(self, audio_bytes: bytes, filename: str, content_type: str) -> tuple[bytes, str, str]:
        """
        Normalizes any incoming audio (WebM Opus from browsers, OGG, MP3, etc.)
        to 16kHz mono 16-bit PCM WAV container required by Gnani Prisma STT API.
        If already valid RIFF/WAVE, returns original untouched.
        """
        if len(audio_bytes) >= 12 and audio_bytes[:4] == b"RIFF" and audio_bytes[8:12] == b"WAVE":
            return audio_bytes, filename or "recording.wav", "audio/wav"

        ffmpeg_bin = shutil.which("ffmpeg")
        if not ffmpeg_bin:
            candidates = [
                r"C:\Users\harsh\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0.1-full_build\bin\ffmpeg.EXE",
                r"C:\ffmpeg\bin\ffmpeg.exe",
                r"C:\Program Files\ffmpeg\bin\ffmpeg.exe",
            ]
            for c in candidates:
                if os.path.exists(c):
                    ffmpeg_bin = c
                    break

        if ffmpeg_bin:
            try:
                proc = subprocess.Popen(
                    [
                        ffmpeg_bin, "-y", "-i", "pipe:0",
                        "-ar", "16000", "-ac", "1",
                        "-c:a", "pcm_s16le", "-f", "wav", "pipe:1"
                    ],
                    stdin=subprocess.PIPE,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE
                )
                converted_bytes, err = proc.communicate(input=audio_bytes, timeout=10)
                if proc.returncode == 0 and len(converted_bytes) > 44:
                    logger.info(f"Converted incoming audio ({len(audio_bytes)} bytes) to 16kHz mono WAV ({len(converted_bytes)} bytes).")
                    return converted_bytes, "recording.wav", "audio/wav"
                else:
                    logger.warning(f"FFmpeg audio conversion failed (code {proc.returncode}): {err.decode('utf-8', errors='ignore')[:200]}")
            except Exception as e:
                logger.error(f"FFmpeg invocation error: {e}")

        return audio_bytes, filename or "recording.wav", content_type or "audio/wav"

    async def transcribe_audio(
        self,
        audio_bytes: bytes,
        filename: str = "audio.wav",
        content_type: str = "audio/wav",
        language_code: Optional[str] = None,
        model: Optional[str] = None,
        output_format: str = "transcribe"
    ) -> Dict[str, Any]:
        """
        Sends audio to Gnani Prisma STT API with intelligent language normalization,
        validation, fallback retries, and clean user-facing error handling.
        """
        # 1. Audio validation
        if not audio_bytes or len(audio_bytes) < 44:
            logger.warning("Gnani STT received empty or truncated audio bytes (< 44 bytes).")
            return {
                "success": False,
                "is_live_api": False,
                "transcript": "",
                "user_message": "Audio recording was empty. Please check your microphone and speak clearly.",
                "error": "Audio recording was empty. Please check your microphone and speak clearly."
            }

        # 1b. Normalize any audio format (e.g. browser WebM/Opus) into 16kHz mono PCM WAV for Gnani Prisma
        audio_bytes, filename, content_type = self._normalize_audio_to_wav(audio_bytes, filename, content_type)

        # 2. Strict language normalization - never send 'te-en' to upstream
        target_lang = normalize_stt_language(language_code or self.default_lang)
        target_model = model or self.default_model

        # 3. Live API call if credentials present
        if self.api_key and self.api_key.strip():
            headers = {
                "X-API-Key-ID": self.api_key.strip()
            }
            files = {
                "audio_file": (filename, audio_bytes, content_type)
            }
            data = {
                "language_code": target_lang,
                "model": target_model,
                "format": output_format
            }

            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.post(
                        self.endpoint,
                        headers=headers,
                        files=files,
                        data=data
                    )

                    # Automatic fallback retry if indic-auto is rejected for any reason
                    if response.status_code == 400 and target_lang != "te-IN":
                        logger.warning(f"Gnani STT 400 with {target_lang}. Retrying with fallback 'te-IN'...")
                        data["language_code"] = "te-IN"
                        response = await client.post(
                            self.endpoint,
                            headers=headers,
                            files=files,
                            data=data
                        )
                        target_lang = "te-IN"

                    if response.status_code == 200:
                        res_json = response.json()
                        logger.info(f"Gnani Prisma STT success: req_id={res_json.get('request_id')}")
                        transcript = (
                            res_json.get("transcript")
                            or res_json.get("transcription")
                            or res_json.get("text")
                            or (res_json.get("data") and isinstance(res_json["data"], dict) and res_json["data"].get("transcript"))
                            or ""
                        )
                        detected_lang = res_json.get("detected_language_code") or target_lang
                        return {
                            "success": True,
                            "is_live_api": True,
                            "transcript": transcript,
                            "request_id": res_json.get("request_id"),
                            "model": res_json.get("model", target_model),
                            "detected_language_code": detected_lang,
                            "processing_time": res_json.get("processing_time", 0.0),
                            "error": None
                        }

                    # Map upstream HTTP status codes to user-friendly messages
                    status = response.status_code
                    raw_text = response.text
                    logger.error(f"Gnani STT API error ({status}): {raw_text}")

                    if status in (401, 403):
                        user_msg = "Voice recognition service authentication failed. Please verify API configuration."
                    elif status in (408, 504):
                        user_msg = "Voice recognition timed out. Please check your connection and speak again."
                    elif status == 429:
                        user_msg = "Voice recognition limit reached. Please wait a moment and try again."
                    elif status == 400:
                        user_msg = "Audio could not be processed. Please speak closer to your microphone."
                    else:
                        user_msg = "Voice service temporarily unavailable. Please try again or type your command."

                    return {
                        "success": False,
                        "is_live_api": True,
                        "transcript": "",
                        "user_message": user_msg,
                        "error": user_msg,
                        "status_code": status
                    }

            except httpx.TimeoutException as e:
                err_msg = "Voice recognition request timed out after 30 seconds. Please try again."
                logger.error(f"Gnani STT Timeout: {e}")
                return {
                    "success": False,
                    "is_live_api": True,
                    "transcript": "",
                    "user_message": err_msg,
                    "error": err_msg
                }
            except httpx.ConnectError as e:
                err_msg = "Unable to connect to voice recognition service. Please check your internet connection."
                logger.error(f"Gnani STT ConnectError: {e}")
                return {
                    "success": False,
                    "is_live_api": True,
                    "transcript": "",
                    "user_message": err_msg,
                    "error": err_msg
                }
            except Exception as e:
                err_msg = "Voice processing error occurred. Please try again."
                logger.error(f"Gnani STT Exception: {e}")
                return {
                    "success": False,
                    "is_live_api": True,
                    "transcript": "",
                    "user_message": err_msg,
                    "error": err_msg
                }

        # Offline / Demo Mode with realistic synthetic mapping
        logger.info("GNANI_API_KEY not configured. Utilizing offline test fixture resolver.")
        simulated_transcript = self._resolve_simulated_transcript(audio_bytes, target_lang)
        return {
            "success": True,
            "is_live_api": False,
            "transcript": simulated_transcript,
            "request_id": "simulated-prisma-stt-local-dev",
            "model": f"{target_model} (simulation-mode)",
            "detected_language_code": target_lang,
            "processing_time": 0.42,
            "error": None
        }

    def _resolve_simulated_transcript(self, audio_bytes: bytes, language: str) -> str:
        """
        Provides realistic sample transcriptions for zero-credential demos.
        """
        if "en" in language.lower():
            return "I sold 10 kilograms of rice today"
        elif "tenglish" in language.lower() or "auto" in language.lower():
            return "Today 10 kilos rice sell chesanu"
        else:
            return "ఈరోజు 10 కిలోల బియ్యం అమ్మాను"

gnani_stt_service = GnaniPrismaSTTService()
