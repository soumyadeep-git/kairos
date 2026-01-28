"""Kairos Voice Scheduling Agent - Natural Conversational AI"""

import os
import asyncio
import json
import logging
from dotenv import load_dotenv

from livekit.agents import AgentServer, JobContext, AgentSession, cli
from livekit.plugins import silero, deepgram, openai, bey, cartesia
from livekit import rtc

from agent import KairosAgent

# SETUP

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("kairos-agent")

server = AgentServer()

# Beyond Presence avatar ID
DEFAULT_AVATAR_ID = "694c83e2-8895-4a98-bd16-56332ca3f449"


# ENTRYPOINT

@server.rtc_session()
async def entrypoint(ctx: JobContext):
    logger.info(f"[Kairos] Job received for room: {ctx.room.name}")
    
    await ctx.connect()
    logger.info("[Kairos] Connected to room")
    
    # Get user participant name
    participant_name = None
    for participant in ctx.room.remote_participants.values():
        if not participant.identity.startswith("agent"):
            participant_name = participant.identity
            logger.info(f"[Kairos] User participant: {participant_name}")
            break

    # Configure LLM (Groq via OpenAI compatibility)
    llm = openai.LLM(
        model="llama-3.3-70b-versatile",
        base_url="https://api.groq.com/openai/v1",
        api_key=os.getenv("GROQ_API_KEY"),
        temperature=0.3,
    )

    # Configure STT
    stt = deepgram.STT(
        model="nova-2",
        language="en-US",
        punctuate=True,
        smart_format=True,
    )
    
    # Configure TTS with Cartesia
    tts = cartesia.TTS(
        model="sonic-english",
        voice="248be419-c632-4f23-adf1-5324ed7dbf1d", # Generic Female
        api_key=os.getenv("CARTESIA_API_KEY"),
    )
    
    # Load VAD
    vad = silero.VAD.load(
        min_speech_duration=0.15,
        min_silence_duration=0.4,
    )

    # Create agent with room reference and user name
    agent = KairosAgent(room=ctx.room, participant_name=participant_name)
    
    # Create session
    session = AgentSession(
        stt=stt,
        llm=llm,
        tts=tts,
        vad=vad,
    )
    
    # Start agent session
    logger.info("[Kairos] Starting agent session...")
    await session.start(room=ctx.room, agent=agent)
    logger.info("[Kairos] Agent session ready!")

    # Setup Beyond Presence avatar (Non-blocking)
    bey_api_key = os.getenv("BEY_API_KEY")
    
    if bey_api_key:
        async def start_avatar():
            logger.info("[Kairos] Initializing Beyond Presence avatar (background)...")
            try:
                avatar = bey.AvatarSession(
                    avatar_id=os.getenv("BEY_AVATAR_ID", DEFAULT_AVATAR_ID),
                )
                await avatar.start(session, room=ctx.room)
                logger.info("[Kairos] Avatar started!")
            except Exception as e:
                logger.error(f"[Kairos] Avatar failed: {e}")
        
        # Start avatar without awaiting it
        asyncio.create_task(start_avatar())
    else:
        logger.warning("[Kairos] No BEY_API_KEY - running without avatar")
    
    # Natural greeting
    await session.say(
        "Hey there! I'm Kairos, your scheduling assistant. What can I do for you today?",
        allow_interruptions=True
    )
    logger.info("[Kairos] Greeting sent - listening...")
    
    # Keep session alive until disconnect
    shutdown = asyncio.Event()
    
    @ctx.room.on("disconnected")
    def on_disconnect():
        logger.info("[Kairos] User disconnected")
        shutdown.set()
    
    await shutdown.wait()
    logger.info("[Kairos] Session ended")


# RUN

if __name__ == "__main__":
    logger.info("=" * 50)
    logger.info("KAIROS VOICE AGENT STARTING")
    logger.info("=" * 50)
    logger.info(f"LiveKit URL: {os.getenv('LIVEKIT_URL', 'NOT SET')}")
    logger.info(f"Groq: {'✓' if os.getenv('GROQ_API_KEY') else '✗'}")
    logger.info(f"Deepgram: {'✓' if os.getenv('DEEPGRAM_API_KEY') else '✗'}")
    logger.info(f"Beyond Presence: {'✓' if os.getenv('BEY_API_KEY') else '✗'}")
    logger.info("=" * 50)
    cli.run_app(server)
