# Angin Architecture Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Component Architecture](#component-architecture)
3. [Data Flow](#data-flow)
4. [Sequence Diagrams](#sequence-diagrams)
5. [API Contracts](#api-contracts)
6. [State Management](#state-management)
7. [Error Handling](#error-handling)
8. [Performance Considerations](#performance-considerations)

---

## System Overview

Angin is a voice-first emotional support application built on a client-server architecture. The system processes user audio input through a multi-stage pipeline involving speech-to-text transcription, AI-powered conversational therapy, and text-to-speech synthesis.

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Angin System                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐         ┌──────────────┐                │
│  │   Frontend   │◄───────►│   Backend    │                │
│  │  React Native│  HTTP   │   FastAPI    │                │
│  │  (Expo App)  │         │              │                │
│  └──────────────┘         └───────┬──────┘                │
│                                    │                        │
│                           ┌────────┴────────┐              │
│                           │                 │              │
│                    ┌──────▼──────┐   ┌─────▼──────┐       │
│                    │   OpenAI    │   │ ElevenLabs │       │
│                    │  (STT/LLM)  │   │   (TTS)    │       │
│                    └─────────────┘   └────────────┘       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Client** | React Native + Expo | Cross-platform mobile UI |
| **Audio Recording** | expo-av | Capture user voice input |
| **Audio Playback** | expo-speech / expo-av | Play TTS responses |
| **Server** | FastAPI (Python) | REST API and business logic |
| **STT** | OpenAI gpt-4o-transcribe | Speech-to-text transcription |
| **LLM** | OpenAI gpt-4o-mini | Conversational therapy agent |
| **TTS** | ElevenLabs API | Natural voice synthesis |
| **Validation** | Pydantic | Request/response schemas |

---

## Component Architecture

### 1. Frontend (React Native / Expo)

**Responsibilities:**
- Capture audio input from device microphone
- Display conversation UI (dial pad, call screen)
- Send audio to backend via multipart/form-data
- Receive and play TTS audio responses
- Maintain conversation state (history, summary)
- Handle network errors and loading states

**Key Screens:**
- `splash.tsx` – Welcome screen
- `dial.tsx` – Phone dial interface
- `call.tsx` – Active conversation screen
- `index.tsx` – Home/navigation

**Audio Handling:**
```typescript
// Recording
import { Audio } from 'expo-av';
const recording = new Audio.Recording();
await recording.startAsync();
const uri = recording.getURI();

// Playback
import * as Speech from 'expo-speech';
Speech.speak(text);
```

### 2. Backend (FastAPI)

**Responsibilities:**
- Receive audio uploads
- Orchestrate STT → Therapy Agent → TTS pipeline
- Manage conversation context
- Validate requests/responses
- Handle external API errors
- Return audio or JSON responses

**Core Modules:**
- `main.py` – API endpoints and orchestration
- Request/response models (Pydantic)
- Audio processing utilities
- External API clients (OpenAI, ElevenLabs)

### 3. OpenAI Integration

**STT (Speech-to-Text):**
- Model: `gpt-4o-transcribe`
- Input: Audio bytes (mp3, wav, m4a, etc.)
- Output: Transcribed text string
- Latency: ~1-3 seconds

**LLM (Therapy Agent):**
- Model: `gpt-4o-mini`
- Mode: JSON output enforced
- Input: System prompt + conversation history
- Output: Structured JSON (mood, urgency, strategy, response, next_action)
- Latency: ~2-5 seconds

### 4. ElevenLabs Integration

**TTS (Text-to-Speech):**
- Model: `eleven_turbo_v2`
- Input: Text string (response from therapy agent)
- Output: Audio bytes (audio/mpeg)
- Latency: ~1-2 seconds
- Voice: Configurable via `ELEVENLABS_VOICE_ID`

---

## Data Flow

### Complete Request Flow

```
User speaks → Audio recorded → Sent to /angin/call
                                      ↓
                              [FastAPI Backend]
                                      ↓
                         ┌────────────┴────────────┐
                         │                         │
                    1. Transcribe              Parse history
                    (OpenAI STT)              from request
                         │                         │
                         └────────────┬────────────┘
                                      ↓
                         2. Append user message to history
                                      ↓
                         3. Call therapy agent (/angin/turn)
                            - Build system prompt
                            - Add conversation context
                            - Call gpt-4o-mini (JSON mode)
                            - Validate response
                                      ↓
                         4. Generate TTS audio
                            (ElevenLabs API)
                                      ↓
                         5. Return audio + metadata headers
                                      ↓
                              [Frontend receives]
                                      ↓
                    Extract metadata → Play audio → Update UI
```

### Detailed Pipeline Stages

#### Stage 1: Audio Upload
```
Frontend                    Backend
   │                           │
   │──── POST /angin/call ────►│
   │    multipart/form-data    │
   │    - audio: File          │
   │    - summary: string?     │
   │    - history: JSON?       │
   │                           │
```

#### Stage 2: Speech-to-Text
```python
# Backend: transcribe_audio()
transcription = client.audio.transcriptions.create(
    model="gpt-4o-transcribe",
    file=(filename, audio_bytes)
)
transcript = transcription.text
# Result: "I've been feeling really anxious about work..."
```

#### Stage 3: History Management
```python
# Parse existing history
message_history = []
if history:
    history_data = json.loads(history)
    message_history = [Message(**msg) for msg in history_data]

# Append new user message
message_history.append(
    Message(role="user", content=transcript)
)
```

#### Stage 4: Therapy Agent Processing
```python
# Build request
therapy_request = AnginTurnRequest(
    summary=summary,
    history=message_history
)

# Call agent
therapy_response = await angin_turn(therapy_request)

# Response structure:
{
    "mood": "anxious",
    "urgency": "medium",
    "strategy": "reflect",
    "response": "That sounds really hard...",
    "next_action": "ask_more"
}
```

#### Stage 5: Text-to-Speech
```python
# Generate audio
tts_response = await http_client.post(
    elevenlabs_url,
    json={"text": therapy_response.response, "model_id": "eleven_turbo_v2"}
)
audio_bytes = tts_response.content
```

#### Stage 6: Response Delivery
```
Backend                     Frontend
   │                           │
   │◄──── audio/mpeg ──────────│
   │    Headers:               │
   │    - X-Transcript         │
   │    - X-Mood               │
   │    - X-Urgency            │
   │    - X-Strategy           │
   │    - X-Response-Text      │
   │    - X-Next-Action        │
   │                           │
```

---

## Sequence Diagrams

### Full Conversation Turn (Audio → Audio)

```
User          Frontend        Backend         OpenAI        ElevenLabs
 │                │              │               │               │
 │─speak─────────►│              │               │               │
 │                │              │               │               │
 │                │─record audio─│               │               │
 │                │              │               │               │
 │                │──POST /angin/call───────────►│               │
 │                │  (audio file)│               │               │
 │                │              │               │               │
 │                │              │──transcribe──►│               │
 │                │              │               │               │
 │                │              │◄──text────────│               │
 │                │              │               │               │
 │                │              │─append to history             │
 │                │              │               │               │
 │                │              │──chat req────►│               │
 │                │              │  (JSON mode)  │               │
 │                │              │               │               │
 │                │              │◄──JSON────────│               │
 │                │              │  response     │               │
 │                │              │               │               │
 │                │              │──TTS request─────────────────►│
 │                │              │               │               │
 │                │              │◄──audio bytes────────────────│
 │                │              │               │               │
 │                │◄─audio/mpeg─│               │               │
 │                │  + headers   │               │               │
 │                │              │               │               │
 │                │─play audio───│               │               │
 │                │              │               │               │
 │◄──hears response              │               │               │
 │                │              │               │               │
```

### Therapy Agent Only (/angin/turn)

```
Client          Backend         OpenAI
 │                │               │
 │──POST /angin/turn─────────────►│
 │  {                │               │
 │    summary,       │               │
 │    history[]      │               │
 │  }                │               │
 │                │               │
 │                │─build prompt──│
 │                │               │
 │                │──chat.completions.create──►│
 │                │  model: gpt-4o-mini        │
 │                │  response_format: json     │
 │                │  messages: [system, ...]   │
 │                │               │
 │                │◄──JSON response────────────│
 │                │  {mood, urgency, ...}      │
 │                │               │
 │                │─validate──────│
 │                │  (Pydantic)   │
 │                │               │
 │◄──AnginTurnResponse────────────│
 │  {                │               │
 │    mood,          │               │
 │    urgency,       │               │
 │    strategy,      │               │
 │    response,      │               │
 │    next_action    │               │
 │  }                │               │
 │                │               │
```

---

## API Contracts

### POST /angin/call

**Purpose:** Complete audio-to-audio therapy flow

**Request:**
```http
POST /angin/call HTTP/1.1
Content-Type: multipart/form-data

--boundary
Content-Disposition: form-data; name="audio"; filename="recording.m4a"
Content-Type: audio/x-m4a

[binary audio data]
--boundary
Content-Disposition: form-data; name="summary"

User has been discussing work stress and sleep issues
--boundary
Content-Disposition: form-data; name="history"

[{"role":"user","content":"I can't sleep"},{"role":"assistant","content":"Tell me more"}]
--boundary--
```

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: audio/mpeg
X-Transcript: I've been feeling really anxious about my deadline
X-Mood: anxious
X-Urgency: medium
X-Strategy: reflect
X-Response-Text: That sounds really hard. When work feels overwhelming...
X-Next-Action: ask_more

[binary audio data]
```

**Error Response:**
```http
HTTP/1.1 500 Internal Server Error
Content-Type: application/json

{
  "detail": "Failed to transcribe audio"
}
```

---

### POST /angin/call-json

**Purpose:** Same flow, returns JSON instead of audio

**Request:** Same as `/angin/call`

**Response:**
```json
{
  "transcript": "I've been feeling really anxious about my deadline",
  "mood": "anxious",
  "urgency": "medium",
  "strategy": "reflect",
  "response_text": "That sounds really hard. When work feels overwhelming, it's tough to find peace. What's weighing on you most?",
  "next_action": "ask_more"
}
```

---

### POST /angin/turn

**Purpose:** Therapy agent processing (no audio)

**Request:**
```json
{
  "summary": "User discussing work stress and sleep issues",
  "history": [
    {
      "role": "user",
      "content": "I've been so stressed lately"
    },
    {
      "role": "assistant",
      "content": "That sounds really hard. What's weighing on you most?"
    },
    {
      "role": "user",
      "content": "I have this big project due tomorrow"
    }
  ]
}
```

**Response:**
```json
{
  "mood": "anxious",
  "urgency": "medium",
  "strategy": "grounding",
  "response": "It's okay to feel this way. Let's take a breath together. What's one small thing you can control right now?",
  "next_action": "ask_more"
}
```

**Field Definitions:**

| Field | Type | Values | Description |
|-------|------|--------|-------------|
| `mood` | string | anxious, sad, overwhelmed, numb, angry, mixed | Detected emotional state |
| `urgency` | string | low, medium, high | Risk/urgency assessment |
| `strategy` | string | reflect, clarify, grounding, reframe, close | Therapeutic approach used |
| `response` | string | - | AI-generated response text (1-3 sentences, <50 words) |
| `next_action` | string | tts_output, ask_more, end | Suggested next step |

---

## State Management

### Conversation History

**Structure:**
```typescript
interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ConversationState {
  history: Message[];
  summary?: string;
  currentMood?: string;
  sessionStartTime: Date;
}
```

**Frontend Responsibilities:**
- Maintain conversation history array
- Append user messages after recording
- Append assistant messages after receiving response
- Serialize history to JSON for API calls
- Limit history to last N turns (e.g., 10) to manage token usage

**Backend Responsibilities:**
- Parse history from request
- Append new user transcript
- Pass complete history to therapy agent
- Do NOT persist history (stateless API)

### Summary Management

**Purpose:** Provide condensed context for long conversations without sending full history

**When to Generate:**
- After every 5-10 turns
- When history exceeds token budget
- When starting a new session with context

**Implementation (Future):**
```python
# Summarization endpoint (not yet implemented)
def generate_summary(history: List[Message]) -> str:
    prompt = "Summarize this conversation in 2-3 sentences..."
    summary = client.chat.completions.create(...)
    return summary
```

---

## Error Handling

### Error Categories

#### 1. Client Errors (4xx)

**400 Bad Request:**
- Invalid audio format
- Empty audio file
- Malformed JSON in history

**Response:**
```json
{
  "detail": "File must be audio type"
}
```

**Handling:**
- Frontend validates audio before upload
- Show user-friendly error message
- Allow retry

#### 2. Server Errors (5xx)

**500 Internal Server Error:**
- STT transcription failure
- LLM API timeout
- TTS generation failure
- JSON parsing error

**Response:**
```json
{
  "detail": "Failed to transcribe audio"
}
```

**Handling:**
- Log error details server-side
- Return generic error to client
- Frontend shows retry option

#### 3. External API Errors

**OpenAI Errors:**
- Rate limiting (429)
- Invalid API key (401)
- Model unavailable (503)

**ElevenLabs Errors:**
- Quota exceeded
- Voice ID not found
- Network timeout

**Handling Strategy:**
```python
try:
    transcription = client.audio.transcriptions.create(...)
except openai.RateLimitError:
    raise HTTPException(503, "Service temporarily unavailable")
except openai.APIError as e:
    print(f"OpenAI error: {e}")
    raise HTTPException(500, "Transcription failed")
```

### Fallback Mechanisms

**1. TTS Fallback:**
```python
# If ElevenLabs fails, return JSON response
try:
    tts_audio = generate_tts(text)
    return Response(content=tts_audio, media_type="audio/mpeg")
except Exception:
    return JSONResponse({
        "response_text": text,
        "error": "TTS unavailable, showing text"
    })
```

**2. History Fallback:**
```python
# If history parsing fails, start fresh
try:
    history_data = json.loads(history)
    message_history = [Message(**msg) for msg in history_data]
except (json.JSONDecodeError, ValidationError):
    print("Warning: Invalid history, starting fresh")
    message_history = []
```

**3. Timeout Handling:**
```python
# Set reasonable timeouts
async with httpx.AsyncClient(timeout=30.0) as client:
    response = await client.post(...)
```

---

## Performance Considerations

### Latency Breakdown

| Stage | Typical Latency | Optimization |
|-------|----------------|--------------|
| Audio upload | 0.5-2s | Compress audio, use efficient codec |
| STT (OpenAI) | 1-3s | Use streaming API (future) |
| LLM (gpt-4o-mini) | 2-5s | Optimize prompt length, use caching |
| TTS (ElevenLabs) | 1-2s | Use turbo model, stream audio |
| Audio download | 0.5-1s | CDN, compression |
| **Total** | **5-13s** | Target: <8s end-to-end |

### Optimization Strategies

**1. Audio Compression:**
```typescript
// Frontend: Use efficient codec
const recording = await Audio.Recording.createAsync({
  android: {
    extension: '.m4a',
    outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4,
    audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC,
    sampleRate: 16000, // Lower sample rate for voice
    numberOfChannels: 1, // Mono
    bitRate: 32000, // Lower bitrate
  },
  ios: {
    extension: '.m4a',
    audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_LOW,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 32000,
  },
});
```

**2. Prompt Optimization:**
```python
# Keep system prompt concise (<200 tokens)
# Limit history to last 10 turns
# Use summary for older context
```

**3. Parallel Processing (Future):**
```python
# Process STT and history parsing in parallel
import asyncio

async def process_call(audio, history):
    transcript_task = asyncio.create_task(transcribe_audio(audio))
    history_task = asyncio.create_task(parse_history(history))
    
    transcript, parsed_history = await asyncio.gather(
        transcript_task, history_task
    )
```

**4. Caching:**
```python
# Cache voice model (ElevenLabs)
# Cache system prompt
# Consider Redis for session state (future)
```

### Token Usage

**Typical Request:**
- System prompt: ~200 tokens
- History (10 turns): ~500 tokens
- Response: ~100 tokens
- **Total:** ~800 tokens per request

**Cost Estimation (gpt-4o-mini):**
- Input: $0.15 / 1M tokens
- Output: $0.60 / 1M tokens
- Per request: ~$0.0002

---

## Security Considerations

### API Key Management
- Store keys in `.env` file (never commit)
- Use environment variables in production
- Rotate keys regularly
- Implement rate limiting

### Input Validation
- Validate audio file size (<10MB)
- Validate audio format (whitelist)
- Sanitize history JSON
- Limit history length

### Data Privacy
- Audio processed in real-time, not stored
- No persistent user data (current version)
- Comply with OpenAI/ElevenLabs data policies
- Implement HTTPS in production

---

## Future Enhancements

### 1. Streaming Responses
```python
# Stream TTS audio as it's generated
async def stream_tts():
    async for chunk in elevenlabs_stream():
        yield chunk
```

### 2. WebSocket Support
```python
# Real-time bidirectional communication
@app.websocket("/ws/call")
async def websocket_call(websocket: WebSocket):
    await websocket.accept()
    # Handle real-time audio streaming
```

### 3. Session Persistence
```python
# Redis-based session storage
session = {
    "user_id": "...",
    "history": [...],
    "summary": "...",
    "created_at": "..."
}
redis.setex(f"session:{session_id}", 3600, json.dumps(session))
```

### 4. Analytics & Monitoring
```python
# Track metrics
metrics = {
    "stt_latency": 2.3,
    "llm_latency": 4.1,
    "tts_latency": 1.8,
    "total_latency": 8.2,
    "mood_distribution": {...}
}
```

---

## Deployment Architecture

### Development
```
Frontend (Expo Dev) ──► Backend (localhost:8000) ──► OpenAI/ElevenLabs
```

### Production
```
Mobile App (iOS/Android)
    │
    ▼
Load Balancer (HTTPS)
    │
    ▼
FastAPI Servers (Kubernetes/Docker)
    │
    ├──► OpenAI API
    └──► ElevenLabs API
```

### Infrastructure Requirements
- **Compute:** 2-4 vCPUs, 4-8GB RAM per instance
- **Network:** Low latency to OpenAI/ElevenLabs
- **Storage:** Minimal (stateless API)
- **Scaling:** Horizontal (stateless design)

---

## Conclusion

The Angin architecture is designed for:
- **Simplicity:** Clear separation of concerns
- **Reliability:** Comprehensive error handling
- **Performance:** Optimized for low latency
- **Scalability:** Stateless, horizontally scalable
- **Maintainability:** Well-documented, modular design

For questions or contributions, refer to the main README.md.
