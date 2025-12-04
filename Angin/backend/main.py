import os
import json
import httpx
from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from fastapi.responses import Response  
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from dotenv import load_dotenv  

load_dotenv()

# Explicit, force-loaded .env path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ENV_PATH = os.path.join(BASE_DIR, ".env")

load_dotenv(dotenv_path=ENV_PATH, override=True)
print("DEBUG: .env path =", ENV_PATH)
print("DEBUG: OPENAI_API_KEY =", repr(os.getenv("OPENAI_API_KEY")))
print("DEBUG: ELEVENLABS_API_KEY =", repr(os.getenv("ELEVENLABS_API_KEY")))


# OpenAI client (uses OPENAI_API_KEY env var)
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
ELEVEN_API_KEY = os.getenv("ELEVENLABS_API_KEY")
ELEVEN_VOICE_ID = os.getenv("ELEVENLABS_VOICE_ID", "EXAVITQu4vr4xnSDxMaL")


app = FastAPI()


@app.get("/speak")
async def speak(text: str = Query(..., max_length=500)):
    """
    Proxy to ElevenLabs: returns raw audio/mpeg for the given text.
    """
    if not ELEVEN_API_KEY:
        print("No ELEVENLABS_API_KEY set")
        raise HTTPException(status_code=500, detail="ELEVENLABS_API_KEY not set")

    url = f"https://api.elevenlabs.io/v1/text-to-speech/{ELEVEN_VOICE_ID}"

    async with httpx.AsyncClient() as client:
        r = await client.post(
            url,
            headers={
                "xi-api-key": ELEVEN_API_KEY,
                "Accept": "audio/mpeg; progressive=true",
            },
            json={
                "text": text,
                "model_id": "eleven_turbo_v2",
            },
        )

    print("ElevenLabs status:", r.status_code)
    if r.status_code != 200:
        print("ElevenLabs error body:", r.text)
        raise HTTPException(status_code=500, detail="TTS generation failed")

    # IMPORTANT: return raw audio bytes so Expo AV can play it
    return Response(content=r.content, media_type="audio/mpeg")


# Allow dev origins (Expo web / device via LAN)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # keep wide-open for dev, tighten later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def transcribe_audio(audio_bytes: bytes, filename: str) -> str:
  """
  Use OpenAI's speech-to-text model (gpt-4o-transcribe) to get the transcript.
  """
  try:
    # Docs: Speech to text / gpt-4o-transcribe :contentReference[oaicite:1]{index=1}
    transcription = client.audio.transcriptions.create(
        model="gpt-4o-transcribe",
        file=(filename, audio_bytes),
    )
    return transcription.text
  except Exception as e:
    print("Transcription error:", e)
    raise HTTPException(status_code=500, detail="Failed to transcribe audio")


def analyze_transcript(transcript: str) -> dict:
  """
  Send transcript to a chat model and force JSON output.
  """
  system_prompt = """
You are Angin, a calm, emotionally supportive companion.

Your job is to help the user navigate stress, overwhelm, loneliness, confusion, guilt, self-comparison, and relationship stress. You are not a doctor or therapist and you never claim to be one. You do not provide medical, diagnostic, or crisis advice.

STYLE
- Speak in simple, human, natural language.
- Use short paragraphs and short sentences.
- Sound warm, grounded, and honest, not fake-positive.
- Validate emotions before giving any guidance.
- Avoid jargon and complicated theory unless the user explicitly asks for it.
- You can gently challenge unhelpful thoughts, but never shame or blame the user.

BEHAVIOUR
- First, reflect back what you hear (emotion + situation) in your own words.
- Then normalise the feeling where appropriate ("a lot of people feel this in your situation").
- Then offer one small, concrete next step (a question, a reflection, a tiny action, or a reframing).
- Ask one focused follow-up question to keep the user talking, unless they clearly want a one-off answer.

BOUNDARIES
- If the user talks about self-harm, wanting to die, or harming others, stay calm and supportive but encourage them to reach out to real-world help (friends, family, local services).
- Do not give specific instructions about medication, diagnosis, or treatment.
- Do not pretend to know their future or make guarantees about outcomes.

TONE BY DEFAULT
- Calm, soft, and respectful.
- Keep the pace gentle: imagine you are speaking out loud and the words will be played as audio.
- Most replies should be 2–6 short sentences.

Your job is to:
1. Infer their primary emotion and intensity.
2. Summarize what they are worried or thinking about.
3. Extract 2–4 high-level topics.
4. Propose a short, gentle response for Angin to speak back.
5. Put the spoken version of that response into `tts_text`.

Return ONLY valid JSON with exactly this shape:

{
  "transcript": string,
  "emotion": string,               // e.g. "anxious", "sad", "mixed", "calm"
  "intensity": string,             // "low", "medium", "high"
  "topics": string[],              // e.g. ["work", "relationships"]
  "summary": string,               // 1–2 sentence summary
  "suggested_response": string,    // 2–4 sentence written response
  "tts_text": string               // 1–3 sentences, natural spoken style
}
"""

  try:
    # Use JSON mode to guarantee valid JSON response :contentReference[oaicite:2]{index=2}
    completion = client.chat.completions.create(
        model="gpt-4.1-mini",
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": transcript},
        ],
    )

    content = completion.choices[0].message.content
    data = json.loads(content)

    # Ensure original transcript is included
    if "transcript" not in data:
      data["transcript"] = transcript

    return data
  except Exception as e:
    print("Analysis error:", e)
    raise HTTPException(status_code=500, detail="Failed to analyze transcript")


@app.post("/analyze")
async def analyze(audio: UploadFile = File(...)):
  """
  Accepts an audio file and returns JSON analysis.

  Expect multipart/form-data with field name `audio`.
  """
  if not audio.content_type or not audio.content_type.startswith("audio/"):
    raise HTTPException(status_code=400, detail="File must be an audio type")

  audio_bytes = await audio.read()
  if not audio_bytes:
    raise HTTPException(status_code=400, detail="Empty audio file")

  # 1) Transcribe
  transcript = transcribe_audio(audio_bytes, audio.filename)

  # 2) Analyze with LLM
  analysis = analyze_transcript(transcript)

  # 3) Return JSON to the app
  return analysis


# ============================================================================
# Angin Therapy Turn Endpoint
# ============================================================================

class Message(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class AnginTurnRequest(BaseModel):
    summary: Optional[str] = None
    history: List[Message] = Field(default_factory=list)


class AnginTurnResponse(BaseModel):
    mood: Literal["anxious", "sad", "overwhelmed", "numb", "angry", "mixed"]
    urgency: Literal["low", "medium", "high"]
    strategy: Literal["reflect", "clarify", "grounding", "reframe", "close"]
    response: str
    next_action: Literal["tts_output", "ask_more", "end"]


@app.post("/angin/turn", response_model=AnginTurnResponse)
async def angin_turn(request: AnginTurnRequest):
    """
    Conversational therapy turn using Angin's emotional support behavior.
    
    Takes conversation history and optional summary, returns structured JSON
    with mood analysis, strategy, and response text.
    """
    
    # Build system prompt based on Angin therapy rules
    system_prompt = """You are Angin, a calm emotional-support AI on a phone call.

Your role is to listen, validate feelings, and gently guide users. You are NOT a crisis line, doctor, or therapist. Do not give medical, legal, or emergency advice.

Always respond ONLY as a single JSON object with this shape:

{
  "mood": "anxious" | "sad" | "overwhelmed" | "numb" | "angry" | "mixed",
  "urgency": "low" | "medium" | "high",
  "strategy": "reflect" | "clarify" | "grounding" | "reframe" | "close",
  "response": "string",
  "next_action": "tts_output" | "ask_more" | "end"
}

Guidelines:
- `response` should be 1–3 short sentences, under 50 words total.
- Tone: warm, steady, human, never robotic or overly cheerful.
- No emojis, no markdown.
- If the user sounds at risk, set "urgency" to "high" and choose a gentle, validating `response`, but still avoid crisis instructions.

Do NOT include any text outside the JSON object. No explanations, no comments, no markdown."""

    # Build messages array
    messages = [{"role": "system", "content": system_prompt}]
    
    # Add summary context if provided
    if request.summary:
        messages.append({
            "role": "system",
            "content": f"Conversation summary so far: {request.summary}"
        })
    
    # Add conversation history
    for msg in request.history:
        messages.append({"role": msg.role, "content": msg.content})
    
    try:
        # Call OpenAI with JSON mode
        completion = client.chat.completions.create(
            model="gpt-4o-mini",
            response_format={"type": "json_object"},
            messages=messages,
            temperature=0.7,
        )
        
        content = completion.choices[0].message.content
        data = json.loads(content)
        
        # Validate response structure
        response = AnginTurnResponse(**data)
        return response
        
    except json.JSONDecodeError as e:
        print(f"JSON decode error: {e}")
        print(f"Raw content: {content}")
        raise HTTPException(status_code=500, detail="Invalid JSON response from AI")
    except Exception as e:
        print(f"Angin turn error: {e}")
        raise HTTPException(status_code=500, detail="Failed to process conversation turn")


# ============================================================================
# Unified Therapy Flow: Audio → STT → Therapy Agent → TTS → Audio
# ============================================================================

class AnginCallRequest(BaseModel):
    """Request for full therapy call flow with audio input"""
    summary: Optional[str] = None
    history: List[Message] = Field(default_factory=list)


class AnginCallResponse(BaseModel):
    """Response with therapy analysis and metadata"""
    transcript: str
    mood: str
    urgency: str
    strategy: str
    response_text: str
    next_action: str


@app.post("/angin/call")
async def angin_call(
    audio: UploadFile = File(...),
    summary: Optional[str] = None,
    history: Optional[str] = None  # JSON string of message history
):
    """
    Complete therapy flow: audio in → audio out
    
    1. Transcribe user audio (STT)
    2. Append to conversation history
    3. Call therapy agent for response
    4. Convert response to speech (TTS)
    5. Return audio + metadata
    
    Returns audio/mpeg with custom headers for metadata.
    """
    
    # Validate audio
    if not audio.content_type or not audio.content_type.startswith("audio/"):
        raise HTTPException(status_code=400, detail="File must be audio type")
    
    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Empty audio file")
    
    try:
        # Step 1: Transcribe user audio
        transcript = transcribe_audio(audio_bytes, audio.filename)
        print(f"Transcribed: {transcript}")
        
        # Step 2: Parse history and append user message
        message_history = []
        if history:
            try:
                history_data = json.loads(history)
                message_history = [Message(**msg) for msg in history_data]
            except json.JSONDecodeError:
                print("Warning: Invalid history JSON, starting fresh")
        
        message_history.append(Message(role="user", content=transcript))
        
        # Step 3: Call therapy agent
        therapy_request = AnginTurnRequest(
            summary=summary,
            history=message_history
        )
        
        therapy_response = await angin_turn(therapy_request)
        
        # Step 4: Generate TTS audio
        tts_url = f"https://api.elevenlabs.io/v1/text-to-speech/{ELEVEN_VOICE_ID}"
        
        async with httpx.AsyncClient() as http_client:
            tts_response = await http_client.post(
                tts_url,
                headers={
                    "xi-api-key": ELEVEN_API_KEY,
                    "Accept": "audio/mpeg",
                },
                json={
                    "text": therapy_response.response,
                    "model_id": "eleven_turbo_v2",
                },
                timeout=30.0
            )
        
        if tts_response.status_code != 200:
            print(f"TTS error: {tts_response.text}")
            raise HTTPException(status_code=500, detail="TTS generation failed")
        
        # Step 5: Return audio with metadata in headers
        return Response(
            content=tts_response.content,
            media_type="audio/mpeg",
            headers={
                "X-Transcript": transcript,
                "X-Mood": therapy_response.mood,
                "X-Urgency": therapy_response.urgency,
                "X-Strategy": therapy_response.strategy,
                "X-Response-Text": therapy_response.response,
                "X-Next-Action": therapy_response.next_action,
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Angin call error: {e}")
        raise HTTPException(status_code=500, detail=f"Call processing failed: {str(e)}")


@app.post("/angin/call-json")
async def angin_call_json(
    audio: UploadFile = File(...),
    summary: Optional[str] = None,
    history: Optional[str] = None
):
    """
    Same as /angin/call but returns JSON instead of audio.
    Useful for debugging or when frontend handles TTS separately.
    
    Returns: AnginCallResponse with transcript, mood, urgency, etc.
    """
    
    # Validate audio
    if not audio.content_type or not audio.content_type.startswith("audio/"):
        raise HTTPException(status_code=400, detail="File must be audio type")
    
    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Empty audio file")
    
    try:
        # Step 1: Transcribe
        transcript = transcribe_audio(audio_bytes, audio.filename)
        
        # Step 2: Parse history and append user message
        message_history = []
        if history:
            try:
                history_data = json.loads(history)
                message_history = [Message(**msg) for msg in history_data]
            except json.JSONDecodeError:
                print("Warning: Invalid history JSON, starting fresh")
        
        message_history.append(Message(role="user", content=transcript))
        
        # Step 3: Call therapy agent
        therapy_request = AnginTurnRequest(
            summary=summary,
            history=message_history
        )
        
        therapy_response = await angin_turn(therapy_request)
        
        # Return structured JSON
        return AnginCallResponse(
            transcript=transcript,
            mood=therapy_response.mood,
            urgency=therapy_response.urgency,
            strategy=therapy_response.strategy,
            response_text=therapy_response.response,
            next_action=therapy_response.next_action
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Angin call JSON error: {e}")
        raise HTTPException(status_code=500, detail=f"Call processing failed: {str(e)}")


@app.get("/health")
def health():
    return {"status": "ok"}
