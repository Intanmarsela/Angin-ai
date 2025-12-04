# Angin – Emotional Support Voice Assistant

## 🌬️ Inspiration

*"Let the wind carry your worries away"*

We live in a world where mental health struggles are increasingly common, yet access to support remains limited. Whether it's 2 AM and you can't sleep, you're overwhelmed at work, or you just need someone to listen without judgment — help isn't always available when you need it most.

**Angin** (Indonesian for "wind") was born from a simple insight: sometimes, just speaking your worries out loud and having them reflected back to you can bring clarity and relief. We wanted to create a safe, private space where anyone could express their feelings freely and receive gentle, empathetic support — instantly, anytime, anywhere.

---

## 🎯 What It Does

Angin is a voice-first emotional support companion that acts like a supportive phone call. Here's how it works:

1. **You speak freely** – Open the app, tap to talk, and express whatever's on your mind
2. **Angin listens** – Your voice is transcribed with high accuracy using OpenAI's speech-to-text
3. **Angin understands** – An AI therapy agent analyzes your emotional state, detecting mood, urgency, and underlying patterns
4. **Angin responds** – You receive a warm, validating response through natural text-to-speech that acknowledges your feelings and gently guides you toward clarity

The conversation is structured around evidence-based therapeutic strategies:
- **Reflection** – Mirroring your feelings back to you
- **Validation** – Normalizing your emotions
- **Grounding** – Helping you focus on the present
- **Reframing** – Offering alternative perspectives
- **Clarification** – Asking gentle questions to deepen understanding

**Angin is NOT a crisis line or a replacement for therapy** — it's a tool for self-awareness, emotional processing, and finding calm in difficult moments.

---

## 🏗️ How We Built It

### Architecture Overview

Angin uses a multi-stage pipeline that processes voice input through several AI services:

```
User Voice → STT (OpenAI) → Therapy Agent (GPT-4o-mini) → TTS (ElevenLabs) → Audio Response
```

### Tech Stack

**Frontend:**
- **React Native + Expo** – Cross-platform mobile development
- **expo-av** – High-quality audio recording
- **expo-speech** – Text-to-speech playback
- **TypeScript** – Type-safe development

**Backend:**
- **FastAPI** – High-performance Python web framework
- **Pydantic** – Request/response validation
- **OpenAI API**
  - `gpt-4o-transcribe` for speech-to-text
  - `gpt-4o-mini` with JSON mode for the therapy agent
- **ElevenLabs API** – Natural, human-like voice synthesis

### The Therapy Agent

The core innovation is our **conversational therapy agent** — a structured system that runs on top of GPT-4o-mini:

```json
{
  "mood": "anxious | sad | overwhelmed | numb | angry | mixed",
  "urgency": "low | medium | high",
  "strategy": "reflect | clarify | grounding | reframe | close",
  "response": "warm, validating 2-3 sentence response",
  "next_action": "tts_output | ask_more | end"
}
```

By enforcing JSON output mode, we ensure:
- **Consistency** – Every response follows therapeutic best practices
- **Safety** – Urgency detection flags high-risk situations
- **Transparency** – We know exactly what strategy the AI is using
- **Reliability** – Structured output prevents hallucinations or off-topic responses

### API Design

We built three core endpoints:

1. **`POST /angin/call`** – Full audio-to-audio pipeline (production endpoint)
2. **`POST /angin/call-json`** – Same flow, returns JSON for debugging
3. **`POST /angin/turn`** – Therapy agent only (for testing and integration)

The system maintains conversation history client-side and passes it with each request, enabling context-aware multi-turn conversations while keeping the backend stateless and scalable.

---

## 🤖 How We Used Kiro AI

**Kiro was instrumental in accelerating our development.** Here's how we leveraged it:

### 1. Agent Specification with Steering Files

We created a **steering file** (`.kiro/steering/angin-therapy.md`) that defines the therapy agent's behavior:
- Purpose and boundaries (emotional support, not medical advice)
- Tone guidelines (warm, calm, short replies)
- JSON output format enforcement
- Safety rules (crisis detection, professional help referrals)

This steering file is automatically included in Kiro's context, ensuring all generated code follows our therapeutic guidelines.

### 2. Rapid API Development

Kiro helped us:
- **Design the FastAPI endpoint structure** – Generated the `/angin/turn` endpoint with proper Pydantic models
- **Integrate OpenAI JSON mode** – Implemented structured output with validation
- **Build the unified pipeline** – Created `/angin/call` that orchestrates STT → Agent → TTS
- **Write test scripts** – Generated Python test utilities for manual endpoint testing

### 3. Code Scaffolding and Refinement

When we needed to optimize token usage, Kiro:
- Identified the verbose system prompt
- Replaced it with a compact version (reducing from ~300 to ~200 tokens)
- Maintained all essential behavior while cutting costs

### 4. Documentation Generation

Kiro assisted in creating:
- Comprehensive `README.md` with setup instructions
- Detailed `ARCHITECTURE.md` with sequence diagrams
- This Devpost summary

**The result:** What would have taken days of manual coding and documentation was completed in hours, allowing us to focus on the user experience and therapeutic quality of the responses.

---

## 🚧 Challenges We Ran Into

### 1. Balancing Empathy with Safety

Creating an AI that's warm and validating while also detecting crisis situations was tricky. We solved this by:
- Implementing urgency scoring (low/medium/high)
- Training the agent to stay supportive even when flagging high urgency
- Avoiding prescriptive crisis instructions (which could be harmful)

### 2. Latency Optimization

The full pipeline (STT → LLM → TTS) initially took 10-15 seconds. We optimized by:
- Using `gpt-4o-mini` instead of larger models
- Compressing audio to 16kHz mono
- Using ElevenLabs' turbo model
- Keeping prompts concise
- **Result:** Reduced to 5-8 seconds end-to-end

### 3. Structured Output Reliability

Early versions sometimes returned malformed JSON or included markdown formatting. We fixed this by:
- Using OpenAI's `response_format={"type": "json_object"}` mode
- Adding explicit "no markdown" instructions to the prompt
- Implementing Pydantic validation to catch errors server-side

### 4. Conversation Context Management

Maintaining conversation history without blowing up token costs required:
- Client-side history management
- Limiting to last 10 turns
- Implementing optional summary field for longer conversations
- Stateless backend design for scalability

---

## 🎓 What We Learned

### Technical Insights

1. **JSON mode is a game-changer** – Structured output makes LLMs reliable enough for production use cases
2. **Prompt engineering matters** – Every word in the system prompt affects behavior and token cost
3. **Audio compression is critical** – Voice-optimized codecs (16kHz, mono, AAC) reduce latency without quality loss
4. **Stateless APIs scale better** – Keeping conversation state client-side simplifies deployment

### Product Insights

1. **Voice feels more intimate than text** – Users are more willing to open up when speaking
2. **Short responses work better** – 2-3 sentences feel conversational; longer responses feel like lectures
3. **Validation before advice** – Always acknowledge feelings before offering guidance
4. **Transparency builds trust** – Showing mood/strategy metadata helps users understand the AI's approach

### AI Development Insights

1. **Kiro accelerates iteration** – Having an AI pair programmer that understands your project context is transformative
2. **Steering files are powerful** – Defining behavior guidelines once and having them automatically applied saves time
3. **Documentation matters** – Well-documented code is easier for both humans and AI to work with

---

## 🚀 What's Next for Angin

### Short-term (Next 3 months)

- **Conversation history UI** – Let users review past conversations and track mood over time
- **Silence detection** – Auto-stop recording after 3-5 seconds of silence
- **Interruptible TTS** – Allow users to stop the AI mid-response
- **iOS/Android app store deployment** – Make Angin available to real users

### Medium-term (6-12 months)

- **Multi-language support** – Start with Spanish, Mandarin, and Bahasa Indonesia
- **Mood timeline visualization** – Show emotional patterns over days/weeks
- **Integration with mental health resources** – Connect users to therapists, hotlines, and support groups
- **Offline mode** – Use local models for privacy-sensitive users

### Long-term Vision

- **Personalization** – Learn user preferences and adapt conversation style
- **Crisis intervention** – Automatic detection and connection to emergency services
- **Therapist collaboration** – Allow licensed therapists to review conversations (with consent)
- **Research partnership** – Contribute anonymized data to mental health research

---

## 🌟 Impact & Vision

Mental health support shouldn't be a luxury. It should be:
- **Accessible** – Available 24/7, no appointments needed
- **Affordable** – Free or low-cost for everyone
- **Private** – No judgment, no stigma
- **Immediate** – Help when you need it, not days later

Angin is a step toward that future. While we're not replacing therapists, we're filling a gap — providing immediate emotional support for the millions of people who need someone to listen, right now.

**Because sometimes, all you need is to speak your worries out loud and let the wind carry them away.**

---

## 📊 Technical Achievements

- ✅ **Sub-8-second latency** for full audio-to-audio pipeline
- ✅ **100% structured output** using OpenAI JSON mode
- ✅ **Multi-turn conversations** with context awareness
- ✅ **5 therapeutic strategies** implemented (reflect, clarify, ground, reframe, close)
- ✅ **Cross-platform mobile app** (iOS + Android via React Native)
- ✅ **Stateless, horizontally scalable** backend architecture
- ✅ **Comprehensive documentation** (README, Architecture, API docs)

---

## 🔗 Links

- **GitHub Repository:** [github.com/yourusername/angin]
- **Live Demo:** [Coming soon]
- **Video Demo:** [YouTube link]
- **Try It:** [App Store / Google Play links]

---

## 👥 Team

[Add your team members and roles here]

---

## 🙏 Acknowledgments

- **OpenAI** – For GPT-4o models that power transcription and conversation
- **ElevenLabs** – For natural, empathetic text-to-speech voices
- **Kiro AI** – For accelerating development with intelligent code generation
- **Expo** – For making cross-platform mobile development accessible
- **Mental health professionals** – For guidance on therapeutic best practices

---

**Built with ❤️ for mental wellness**

*Self-awareness is the foundation of growth. Naming your problem is already half the solution.*
