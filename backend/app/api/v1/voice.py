import os
import io
import httpx
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from app.models.user import User
from app.schemas.hackathon import VoiceTranscribeResponse
from app.api.deps import get_current_active_user
from app.core.config import settings

router = APIRouter()

GROQ_WHISPER_URL = "https://api.groq.com/openai/v1/audio/transcriptions"
WHISPER_MODEL = "whisper-large-v3-turbo"


@router.post("/transcribe", response_model=VoiceTranscribeResponse)
async def transcribe_audio(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
) -> any:
    """
    Transcribe audio to text using Groq Whisper API.
    Zero LLM reasoning tokens — only audio duration is billed.
    Accepts: audio/webm, audio/mp4, audio/wav, audio/mp3
    """
    allowed_types = {"audio/webm", "audio/mp4", "audio/wav", "audio/mpeg", "audio/ogg"}
    content_type = file.content_type or "audio/webm"

    audio_bytes = await file.read()
    if len(audio_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty audio file")

    if len(audio_bytes) > 25 * 1024 * 1024:  # 25MB Groq limit
        raise HTTPException(status_code=413, detail="Audio file too large (max 25MB)")

    headers = {
        "Authorization": f"Bearer {settings.GROQ_API_KEY}",
    }

    files = {
        "file": (file.filename or "audio.webm", audio_bytes, content_type),
        "model": (None, WHISPER_MODEL),
        "response_format": (None, "json"),
    }

    async with httpx.AsyncClient(timeout=60.0, verify=False) as client:
        try:
            response = await client.post(GROQ_WHISPER_URL, headers=headers, files=files)
            response.raise_for_status()
        except httpx.HTTPStatusError as e:
            raise HTTPException(
                status_code=502,
                detail=f"Whisper API error: {e.response.text}",
            )
        except httpx.RequestError as e:
            raise HTTPException(status_code=503, detail=f"Cannot reach Groq API: {str(e)}")

    data = response.json()
    return VoiceTranscribeResponse(
        text=data.get("text", "").strip(),
        language=data.get("language"),
    )
