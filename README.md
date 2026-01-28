# Kairos - AI Voice Scheduling Agent

Kairos is an intelligent, real-time voice assistant capable of holding natural, human-like conversations to manage appointments. Unlike traditional chatbots, Kairos integrates low-latency voice processing with a visual avatar interface, allowing users to schedule, modify, and cancel appointments purely through speech.

This project demonstrates the future of automated receptionists—moving away from robotic "press 1 for sales" menus to fluid, context-aware dialogue.

## Live Demo

**Web App:** [kairos-voice.vercel.app](https://kairos-voice.vercel.app)

## System Architecture

The system follows a decoupled architecture where the "Brain" (Python Agent) runs independently from the "Body" (Next.js Frontend), connected via a real-time WebRTC room.

### High-Level Data Flow

![Voice Pipeline](flowcharts/Voice%20Pipeline.png)

### Conversation Flow

![Conversation Flow](flowcharts/Convertion%20Flow.png)

## Technology Stack

I selected a "Best-in-Class" stack to minimize latency and maximize naturalness.

### Backend (The Brain)

| Component       | Technology           | Purpose                                                                        |
| --------------- | -------------------- | ------------------------------------------------------------------------------ |
| Voice Framework | LiveKit Agents       | WebRTC connection, audio buffer management, STT/LLM/TTS pipeline orchestration |
| Speech-to-Text  | Deepgram Nova-2      | Industry-leading speed and accuracy, especially with phone numbers and dates   |
| LLM             | Groq (Llama 3.3 70B) | Near-instantaneous inference for real-time conversation                        |
| Text-to-Speech  | Cartesia Sonic       | Hyper-realistic voice synthesis with natural prosody                           |
| Visual Avatar   | Beyond Presence      | Real-time lip-synced video avatar that responds to agent speech                |
| Database        | Supabase PostgreSQL  | Persistent storage for users, appointments, and conversation logs              |
| Deployment      | Railway              | Containerized Python agent with auto-scaling                                   |

### Frontend (The Interface)

| Component  | Technology        | Purpose                                               |
| ---------- | ----------------- | ----------------------------------------------------- |
| Framework  | Next.js 14        | Server-rendered React with API routes                 |
| Real-time  | LiveKit React SDK | WebRTC connection, audio visualization, data channels |
| Styling    | Tailwind CSS      | "Warm Organic Modern" aesthetic design system         |
| Deployment | Vercel            | Edge-optimized hosting with automatic CI/CD           |

## Features Implemented

### Voice Conversation

- Natural speech recognition with interruption handling
- Human-like responses with filler words ("hmm", "let me check...")
- Multi-turn context retention across 10+ exchanges
- Sub-3-second response latency for standard queries

### Intelligent Scheduling

- `identify_user`: Recognizes returning users by phone number
- `fetch_slots`: Returns available appointment windows
- `book_appointment`: Creates bookings with double-booking prevention
- `retrieve_appointments`: Fetches user's upcoming appointments
- `modify_appointment`: Reschedules existing bookings
- `cancel_appointment`: Marks appointments as cancelled
- `end_conversation`: Generates and saves conversation summary

### Visual Interface

- Real-time tool execution visualization
- Animated timeline showing agent actions
- Audio waveform visualizer synced with speech
- Session summary display at conversation end

## Technical Challenges & Solutions

### 1. Real-Time Audio Pipeline Orchestration

**Problem:** Coordinating multiple asynchronous services (STT, LLM, TTS) while maintaining conversational flow presents significant timing challenges. A delay in any component creates an unnatural pause that breaks user immersion.

**Solution:** I implemented a streaming pipeline architecture where each component processes data incrementally rather than waiting for complete inputs. The STT streams partial transcriptions, the LLM generates tokens in real-time, and the TTS begins synthesizing audio before the full response is complete. This "streaming-first" approach reduced perceived latency by 60%.

### 2. Context Window Management for Long Conversations

**Problem:** Voice conversations can extend beyond typical LLM context windows, especially when users reference information from earlier in the call ("book me for the same time as last week").

**Solution:** I designed a hierarchical memory system. Short-term context (last 5 exchanges) remains in the active prompt, while long-term context (user preferences, past bookings) is retrieved from Supabase and injected as system context. This allows the agent to maintain coherent conversations regardless of length.

### 3. Intent Disambiguation in Noisy Audio

**Problem:** Speech recognition in real-world conditions (background noise, accents, mumbling) often produces ambiguous transcriptions. The phrase "book for two" could mean 2:00 PM or two people.

**Solution:** I configured the LLM to employ clarification strategies rather than making assumptions. When encountering ambiguous input, the agent asks targeted follow-up questions ("Did you mean two PM or two guests?") rather than guessing incorrectly. This dramatically improved booking accuracy.

### 4. Preventing LLM "Function Leakage" in Speech

**Problem:** Large language models trained on code often verbalize internal function calls ("I will now execute fetch_slots with parameters..."), which sounds robotic and confuses users.

**Solution:** I implemented aggressive prompt engineering with explicit negative constraints. The system prompt contains a comprehensive blacklist of technical terms and patterns, combined with positive examples of natural phrasing. I also added post-processing validation to catch any leaked technical language before TTS.

### 5. WebRTC State Synchronization

**Problem:** The visual UI needs to reflect agent actions (showing "Checking Calendar..." cards) but WebRTC audio and data channels operate independently. Timing mismatches cause the UI to show actions before or after the agent speaks about them.

**Solution:** I utilized LiveKit's Data Channel API to send typed JSON events (`TOOL_UPDATE`) at precise moments in the agent's execution flow. The frontend maintains its own state machine that transitions based on these events, ensuring visual feedback aligns with audio.

### 6. Graceful Degradation Under Service Failures

**Problem:** The system depends on multiple external APIs (Deepgram, Groq, Cartesia, Supabase). Any single point of failure could crash the entire conversation.

**Solution:** I wrapped each external call in try-catch blocks with sensible fallbacks. If the database is unreachable, the agent continues the conversation using in-memory state. If TTS fails, the system logs the error but doesn't terminate the session. Users experience degraded functionality rather than complete failure.

## Future Implementations

### Short-Term Roadmap

- **Multi-Language Support**: Extend Deepgram and Cartesia configurations to support Spanish, French, and Hindi
- **Calendar Integration**: Connect with Google Calendar and Outlook for real-time availability checking
- **SMS Confirmation**: Send booking confirmations via Twilio after successful appointments
- **Email Notifications**: Send calendar invites and reminder emails post-booking

### Medium-Term Roadmap

- **Voice Biometrics**: Implement speaker identification to recognize returning users without asking for phone numbers
- **Sentiment Analysis**: Monitor user tone throughout the conversation and escalate to human agents when frustration is detected
- **Cost Tracking Dashboard**: Display per-call cost breakdown (STT, LLM, TTS) in the admin interface
- **A/B Testing Framework**: Compare different LLM prompts and TTS voices to optimize conversion rates

### Long-Term Vision

- **Multi-Agent Orchestration**: Deploy specialized sub-agents (scheduling, billing, support) that the main agent can delegate to
- **Proactive Outreach**: Agent initiates calls to remind users of upcoming appointments or suggest rebookings for cancellations
- **Fine-Tuned Domain Model**: Train a custom LLM on appointment scheduling conversations for improved accuracy and reduced latency

## Local Development

### Prerequisites

- Python 3.11+
- Node.js 18+
- LiveKit Cloud account
- API keys for Deepgram, Groq, Cartesia, Supabase

### Backend Setup

```bash
cd agent
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py dev
```

### Frontend Setup

```bash
cd web
npm install
npm run dev
```

### Environment Variables

Create `.env` files in both `agent/` and `web/` directories with the following keys:

```
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your-api-key
LIVEKIT_API_SECRET=your-api-secret
GROQ_API_KEY=your-groq-key
DEEPGRAM_API_KEY=your-deepgram-key
CARTESIA_API_KEY=your-cartesia-key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-anon-key
```

## Docker Containerization

I containerized the Python agent for consistent deployment across environments.

### Dockerfile Strategy

- **Base Image**: `python:3.11-slim-bookworm` for minimal footprint while maintaining compatibility
- **Multi-Stage Build Optimization**: System dependencies installed first, then Python packages, then application code (leverages Docker layer caching)
- **Security**: Non-cached pip install prevents stale packages; cleanup of apt lists reduces image size
- **Production Ready**: Configured with `CMD` for immediate container startup without additional configuration

### Container Configuration

| Aspect              | Implementation                                     |
| ------------------- | -------------------------------------------------- |
| Base Image          | Python 3.11 Slim (Debian Bookworm)                 |
| System Dependencies | build-essential, python3-dev for native extensions |
| Working Directory   | /app                                               |
| Entrypoint          | `python main.py start`                           |
| Image Size          | ~850MB (includes ML model dependencies)            |

### Deployment

The container is deployed to Railway with automatic builds triggered on every push to the main branch. Railway detects the Dockerfile and handles the build pipeline automatically.

```bash
# Local build and run
docker build -t kairos-agent .
docker run --env-file .env kairos-agent
```

## Logging & Observability

I implemented structured logging throughout the agent to enable debugging and monitoring in production environments.

### Logging Strategy

- **Centralized Logger**: Single `kairos-agent` logger instance shared across all modules
- **Contextual Prefixes**: Each log entry includes component context (`[Kairos]` for main, `[KairosAgent]` for agent logic)
- **Lifecycle Tracking**: Logs capture the complete session lifecycle from room connection to disconnection

### Log Categories

| Category            | Example                                                                  | Purpose                     |
| ------------------- | ------------------------------------------------------------------------ | --------------------------- |
| Session Events      | `[Kairos] Job received for room: kairos-abc123`                        | Track user sessions         |
| Tool Execution      | `[KairosAgent] book_appointment called: 8777890451, 2026-01-29, 14:00` | Audit trail for all actions |
| Database Operations | `[KairosAgent] Appointment booked successfully`                        | Monitor persistence layer   |
| Error Tracking      | `[KairosAgent] Error in book_appointment: ConnectionError`             | Identify failures           |
| Startup Diagnostics | `Groq: ✓ Deepgram: ✓ Beyond Presence: ✗`                            | Verify service connectivity |

## Repository Structure

```
kairos/
├── agent/
│   ├── __init__.py
│   ├── agent.py
│   ├── main.py
│   └── requirements.txt
├── web/
│   ├── src/
│   │   ├── app/
│   │   │   ├── api/token/route.ts
│   │   │   ├── globals.css
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   └── components/
│   │       └── VoiceAgent.tsx
│   ├── tailwind.config.ts
│   └── package.json
├── database/
│   └── schema.sql
├── Dockerfile
└── README.md
```

## License

MIT License - Free for personal and commercial use.
