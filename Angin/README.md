# 🌬️ Angin – Emotional Support Voice Assistant

> *"Let the wind carry your worries away"*

**Angin** (Indonesian for "wind") is a mobile emotional support app that provides a safe, judgment-free space to express your feelings through voice. Speak your worries, and Angin listens, reflects, and gently guides you toward clarity.

---

## 🎯 Overview

Angin acts like an emotional support "phone call" — a calm, empathetic AI companion available whenever life feels overwhelming. It's designed for moments when you need to talk but can't reach out to anyone, when your thoughts feel tangled, or when you just need someone to listen.

**Angin is NOT:**
- A crisis hotline
- A replacement for therapy
- Medical or diagnostic advice

**Angin IS:**
- A safe space to express emotions
- A tool for self-awareness and reflection
- A gentle guide through stress, anxiety, and overwhelm

---

## 🎬 Live Demo

**Try Angin now:**

- **Mobile App (APK):** [https://expo.dev/accounts/marsela_engo/projects/Angin]
- **Backend API:** [https://angin-ai-production.up.railway.app]

**Note:** No login required. Install and start using immediately.

---


## 📋 Submission Details

### Kiro Hackathon Submission

**Main Category:** Mobile AI App

**Bonus Category:** Best Use of Steering Documents

**Why this bonus category?**  
Angin demonstrates advanced use of Kiro's steering documents to enforce therapeutic behavior, safety constraints, and consistent tone across all AI responses. The `.kiro/steering/angin-therapy.md` file defines:
- Emotional support boundaries (not medical advice, not crisis intervention)
- Structured JSON output format with mood, urgency, and strategy fields
- Tone guidelines (warm, calm, short replies under 50 words)
- Safety rules for high-urgency situations

This steering document ensures every response follows evidence-based therapeutic practices while maintaining emotional safety, making it a core architectural component rather than just configuration.

---

## ✨ Features

- **🎤 Voice-First Interface** – Speak naturally, no typing required
- **🧠 Emotional Intelligence** – AI-powered mood detection and analysis
- **💬 Conversational Therapy Agent** – Structured emotional support using validated strategies
- **🔊 Natural TTS Responses** – Warm, human-like voice feedback via ElevenLabs
- **📊 Structured Insights** – Mood, urgency, and strategy tracking for each conversation
- **🔒 Privacy-Focused** – Conversations are processed in real-time, not stored permanently

---

## 🏗️ Architecture

```
┌─────────────────┐
│  React Native   │  User speaks into the app
│   (Expo App)    │
└────────┬────────┘
         │ Audio (multipart/form-data)
         ▼
┌─────────────────┐
│  FastAPI Server │
│                 │
│  ┌───────────┐  │
│  │    STT    │  │  OpenAI Whisper (gpt-4o-transcribe)
│  └─────┬─────┘  │
│        │        │
│  ┌─────▼─────┐  │
│  │  Therapy  │  │  GPT-4o-mini with structured JSON output
│  │   Agent   │  │  (mood, urgency, strategy, response)
│  └─────┬─────┘  │
│        │        │
│  ┌─────▼─────┐  │
│  │    TTS    │  │  ElevenLabs text-to-speech
│  └───────────┘  │
└────────┬────────┘
         │ Audio (audio/mpeg)
         ▼
┌─────────────────┐
│   User hears    │
│    response     │
└─────────────────┘
```

---

## 🤖 How Kiro Was Used

Kiro AI was instrumental in accelerating Angin's development from concept to working prototype. Here's how we leveraged Kiro's key features:

### Vibe Coding

Kiro served as my primary development partner throughout the project. I used conversational prompts to:
- Scaffold FastAPI endpoints with proper Pydantic validation
- Design JSON response schemas for the therapy agent
- Build React Native screens with audio recording and playback
- Iterate rapidly by sending error messages and receiving targeted fixes
- Refactor code for performance (e.g., reducing system prompt tokens from ~300 to ~200)

The vibe coding approach allowed me to focus on therapeutic quality and user experience while Kiro handled implementation details.

### Spec-Driven Development

I created a structured specification for the Angin therapy agent that defined:
- Output schema: `mood`, `urgency`, `strategy`, `response`, `next_action`
- Therapeutic strategies: reflect, clarify, grounding, reframe, close
- Safety constraints: urgency detection, crisis handling, professional help referrals

Kiro used this spec to generate stable, predictable agent logic with enforced JSON output mode. When requirements changed, I updated the spec and Kiro regenerated the implementation consistently.

### Steering Documents

The `.kiro/steering/angin-therapy.md` steering document defines the therapy agent's core behavior:
- **Purpose:** Emotional support, explicitly NOT crisis intervention or medical advice
- **Tone:** Warm, calm, human, never robotic or overly cheerful
- **Response format:** 1-3 short sentences, under 50 words, no emojis or markdown
- **Safety rules:** High urgency detection with gentle validation, avoid prescriptive crisis instructions

This steering file is automatically included in Kiro's context, ensuring all generated code follows therapeutic best practices. It acts as a "constitution" for the AI's behavior, making the system reliable and safe.

### Hooks

**Current Usage:** Minimal in this version.

**Planned Usage:** In future iterations, Kiro hooks will:
- Auto-regenerate agent code when the therapy spec is updated
- Run test suites automatically after endpoint changes
- Update documentation when API contracts change
- Trigger linting and validation on file save

### Model Context Protocol (MCP)

**Status:** Not used in this version.

**Future Consideration:** MCP could enable integration with external mental health resources, crisis databases, or therapist referral systems.

---

## 🛠️ Tech Stack

### Frontend
- **React Native** – Cross-platform mobile framework
- **Expo** – Development platform and tooling
- **expo-av** – Audio recording
- **expo-speech** – Text-to-speech playback
- **TypeScript** – Type-safe development

### Backend
- **FastAPI** – High-performance Python web framework
- **OpenAI API**
  - `gpt-4o-transcribe` – Speech-to-text
  - `gpt-4o-mini` – Conversational therapy agent with JSON mode
- **ElevenLabs API** – Natural text-to-speech
- **Pydantic** – Request/response validation

### AI/ML
- **Structured JSON Output** – Enforced response format for reliability
- **Conversation History** – Context-aware multi-turn conversations
- **Therapy Strategies** – Reflection, validation, grounding, reframing, closure

---

## 📁 Project Structure

```
Angin/
├── app/                      # React Native screens (Expo Router)
│   ├── (tabs)/              # Tab navigation screens
│   ├── splash.tsx           # Welcome/splash screen
│   ├── dial.tsx             # Phone dial interface
│   ├── call.tsx             # Active call screen
│   ├── index.tsx            # Home screen
│   └── _layout.tsx          # Root layout
├── backend/                 # FastAPI server
│   ├── main.py              # API endpoints and business logic
│   ├── requirements.txt     # Python dependencies
│   └── .env                 # Environment variables (API keys)
├── components/              # Reusable React components
│   ├── ui/                  # UI component library
│   └── themed-*.tsx         # Theme-aware components
├── constants/               # App constants and theme
├── hooks/                   # Custom React hooks
├── scripts/                 # Testing and utility scripts
│   ├── test_angin_turn.py   # Test therapy agent endpoint
│   └── test_angin_call.py   # Test full audio pipeline
├── assets/                  # Images, icons, fonts
├── .kiro/                   # Kiro AI steering rules
│   └── steering/
│       └── angin-therapy.md # Therapy agent behavior guidelines
├── package.json             # Node.js dependencies
├── app.json                 # Expo configuration
└── README.md                # This file
```

---

## 🔌 API Documentation

### Core Endpoints

#### `POST /angin/call`
**Full audio-to-audio therapy flow**

**Request:**
- `audio` (file): Audio recording (mp3, wav, m4a, etc.)
- `summary` (optional): Running conversation summary
- `history` (optional): JSON string of previous messages

**Response:**
- `audio/mpeg` – TTS audio of the therapy response
- Headers:
  - `X-Transcript`: User's transcribed text
  - `X-Mood`: Detected mood (anxious, sad, overwhelmed, numb, angry, mixed)
  - `X-Urgency`: Urgency level (low, medium, high)
  - `X-Strategy`: Applied strategy (reflect, clarify, grounding, reframe, close)
  - `X-Response-Text`: Text version of the response
  - `X-Next-Action`: Suggested next action (tts_output, ask_more, end)

---

#### `POST /angin/call-json`
**Same flow, returns JSON instead of audio**

**Request:** Same as `/angin/call`

**Response (JSON):**
```json
{
  "transcript": "I've been feeling really anxious about work...",
  "mood": "anxious",
  "urgency": "medium",
  "strategy": "reflect",
  "response_text": "That sounds really hard. When work feels overwhelming, it's tough to find peace. What's weighing on you most?",
  "next_action": "ask_more"
}
```

---

#### `POST /angin/turn`
**Therapy agent only (no audio processing)**

**Request (JSON):**
```json
{
  "summary": "User discussing work stress and sleep issues",
  "history": [
    {"role": "user", "content": "I can't stop thinking about my deadline"},
    {"role": "assistant", "content": "That sounds stressful. Tell me more."}
  ]
}
```

**Response (JSON):**
```json
{
  "mood": "anxious",
  "urgency": "medium",
  "strategy": "grounding",
  "response": "It's okay to feel this way. Let's take a breath together. What's one small thing you can control right now?",
  "next_action": "ask_more"
}
```

---

### Legacy Endpoints

- `POST /analyze` – Audio transcription + old analysis format
- `GET /speak?text=...` – Direct TTS (text to audio)
- `GET /health` – Health check

---
**Note:** No login required. Install and start using immediately.

## 🚀 Setup Instructions

### Prerequisites

- **Node.js** (v18+)
- **Python** (3.9+)
- **Expo CLI** (`npm install -g expo-cli`)
- **API Keys:**
  - OpenAI API key
  - ElevenLabs API key

### Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd Angin/backend
   ```

2. **Create virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables:**
   Create `.env` file:
   ```env
   OPENAI_API_KEY=your_openai_key_here
   ELEVENLABS_API_KEY=your_elevenlabs_key_here
   ELEVENLABS_VOICE_ID=your_voice_id_here
   ```

5. **Run the server:**
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

   Server will be available at `http://localhost:8000`

### Frontend Setup

1. **Navigate to project root:**
   ```bash
   cd Angin
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Update API endpoint:**
   Edit your app code to point to your backend URL (e.g., `http://192.168.x.x:8000` for local network testing)

4. **Start Expo development server:**
   ```bash
   npm start
   ```

5. **Run on device/simulator:**
   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Scan QR code with Expo Go app for physical device

---

## 🧪 Testing

### Test Therapy Agent
```bash
python scripts/test_angin_turn.py
```

### Test Full Audio Pipeline
```bash
# Requires a test audio file
python scripts/test_angin_call.py
```

### Manual API Testing
```bash
# Health check
curl http://localhost:8000/health

# Test TTS
curl "http://localhost:8000/speak?text=Hello%20world" --output test.mp3

# Test therapy agent
curl -X POST http://localhost:8000/angin/turn \
  -H "Content-Type: application/json" \
  -d '{
    "history": [
      {"role": "user", "content": "I feel overwhelmed"}
    ]
  }'
```

---

## ⚠️ Safety & Limitations

### What Angin Does
- Provides emotional support and validation
- Helps identify feelings and patterns
- Offers gentle guidance and reflection
- Uses evidence-based conversational strategies

### What Angin Does NOT Do
- **Not a crisis service** – If you're in crisis, contact emergency services or a crisis hotline
- **Not medical advice** – Does not diagnose or treat mental health conditions
- **Not a therapist** – Cannot replace professional mental health care
- **Not for emergencies** – For self-harm or suicidal thoughts, seek immediate professional help

### Crisis Resources
- **US:** National Suicide Prevention Lifeline: 988
- **International:** Find resources at [findahelpline.com](https://findahelpline.com)

---

## 🔐 Privacy

- Audio is processed in real-time and not permanently stored on servers
- Conversations are sent to OpenAI and ElevenLabs APIs (subject to their privacy policies)
- No user accounts or persistent data storage in current version
- For production use, implement proper data handling and privacy controls

---

## 🗺️ Roadmap

- [ ] Conversation history and mood timeline
- [ ] Silence-based auto-stop for recordings
- [ ] Interruptible TTS playback
- [ ] Offline mode with local models
- [ ] Multi-language support
- [ ] Integration with mental health resources
- [ ] User accounts and encrypted storage

---

## 🔓 Authentication Notes

**No login required.** Angin is designed for immediate access:
- No user accounts or registration
- No authentication barriers
- Install and start using immediately
- Judges can test the app without any setup

This design choice prioritizes accessibility — when someone needs emotional support, they shouldn't have to create an account first.

---

## 📂 Folder Structure Compliance

### Kiro-Specific Directories

The `.kiro/` directory at the project root contains Kiro AI configuration:

```
.kiro/
└── steering/
    └── angin-therapy.md    # Therapy agent behavior guidelines
```

**Note:** The `/hooks` directory in the project root contains **React hooks** (custom React logic), which are separate from **Kiro hooks** (agent automation). Kiro hooks would be stored in `.kiro/hooks/` when implemented.

### Project Organization

- **Frontend code:** `/app`, `/components`, `/constants`
- **Backend code:** `/backend`
- **Documentation:** `/docs` (ARCHITECTURE.md, DEVPOST_SUMMARY.md)
- **Testing scripts:** `/scripts`
- **Kiro configuration:** `/.kiro`

---

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

## 👥 Contact

**Project Maintainer:** Intan Marsela  
**Email:** Marsela.code@gmail.com  
**GitHub:** [github.com/Intanmarsela/Angin-ai](https://github.com/Intanmarsela/Angin-ai)

---

## 🙏 Acknowledgments

- **OpenAI** – GPT-4o models for transcription and conversation
- **ElevenLabs** – Natural text-to-speech voices
- **Expo** – React Native development platform
- **FastAPI** – Modern Python web framework

---

**Built with ❤️ for mental wellness and emotional support**

*Remember: Self-awareness is the foundation of growth. Naming your problem is already half the solution.*
