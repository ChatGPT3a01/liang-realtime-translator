import asyncio
import pyaudio
import sys
import os
from google import genai
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# --- Configuration ---
# Get API Key from environment variable
API_KEY = os.getenv("GOOGLE_API_KEY") 
MODEL = "gemini-3.5-flash"  # Use the model specified by the user

# Audio Configuration
FORMAT = pyaudio.paInt16
CHANNELS = 1
RATE_IN = 16000   # Microphone Input Rate
RATE_OUT = 24000  # Gemini Output Rate
CHUNK = 1024      # Buffer Size

class AudioHandler:
    def __init__(self):
        self.p = pyaudio.PyAudio()
        self.input_stream = None
        self.output_stream = None

    def start_streams(self):
        # Input Stream (Microphone)
        self.input_stream = self.p.open(
            format=FORMAT,
            channels=CHANNELS,
            rate=RATE_IN,
            input=True,
            frames_per_buffer=CHUNK
        )
        
        # Output Stream (Speaker)
        self.output_stream = self.p.open(
            format=FORMAT,
            channels=CHANNELS,
            rate=RATE_OUT,
            output=True,
        )
        print("🎤 Audio streams started. Ready for conversation!")

    def stop_streams(self):
        if self.input_stream:
            self.input_stream.stop_stream()
            self.input_stream.close()
        if self.output_stream:
            self.output_stream.stop_stream()
            self.output_stream.close()
        self.p.terminate()
        print("🛑 Audio streams stopped.")

async def send_audio(session, audio_handler):
    """Reads audio from mic and sends to Gemini."""
    print(">>> Start recording/sending...")
    while True:
        try:
            # Read from microphone (blocking call formatted to async)
            audio_data = await asyncio.to_thread(
                audio_handler.input_stream.read, CHUNK, exception_on_overflow=False
            )
            
            # Send to Gemini
            # 'mime_type' for raw PCM audio is usually "audio/pcm"
            await session.send(input={"data": audio_data, "mime_type": "audio/pcm"})
            
        except Exception as e:
            print(f"Error sending audio: {e}")
            break

async def receive_audio(session, audio_handler):
    """Receives audio from Gemini and plays it."""
    print("<<< Start receiving/playing...")
    try:
        async for response in session.receive():
            server_content = response.server_content
            if server_content is not None:
                model_turn = server_content.model_turn
                if model_turn is not None:
                    for part in model_turn.parts:
                        # Check for inline audio data
                        if part.inline_data:
                            audio_data = part.inline_data.data
                            # Play audio (blocking call formatted to async)
                            await asyncio.to_thread(audio_handler.output_stream.write, audio_data)
            
            # Handle tool calls or other content types if necessary
            # For this simple translator, we primarily care about audio back.
            
    except Exception as e:
        print(f"Error receiving audio: {e}")

async def main():
    if not API_KEY or API_KEY == "YOUR_API_KEY_HERE":
        print("❌ Error: Please set your 'GOOGLE_API_KEY' in the .env file.")
        return

    client = genai.Client(api_key=API_KEY, http_options={'api_version': 'v1alpha'})
    
    # --- Language Configuration Options (Choose One) ---
    
    # Option 1: Chinese <-> Japanese (Default)
    # instructions = "你是一個中文-日文即時對話翻譯官。請將聽到的中文翻成日文，日文翻成中文，僅輸出翻譯後的音訊。"

    # Option 2: Chinese <-> English
    instructions = "你是一個中文-英文即時對話翻譯官。請將聽到的中文翻成英文，英文翻成中文，僅輸出翻譯後的音訊。"

    # Option 3: Universal (Chinese / Japanese / English)
    # instructions = "你是中日英三語即時翻譯官。聽到中文就翻成英文與日文；聽到英文或是日文，請翻成中文。僅輸出翻譯後的音訊。"

    config = {
        "response_modalities": ["AUDIO"],
        "system_instruction": instructions
    }

    try:
        async with client.aio.live.connect(model=MODEL, config=config) as session:
            print(f"✅ Connected to Gemini Live API ({MODEL})")
            
            audio_handler = AudioHandler()
            audio_handler.start_streams()

            # Create tasks for bidirectional communication
            send_task = asyncio.create_task(send_audio(session, audio_handler))
            receive_task = asyncio.create_task(receive_audio(session, audio_handler))

            # Wait for tasks (basically run forever until interrupted)
            await asyncio.gather(send_task, receive_task)

    except asyncio.CancelledError:
        pass
    except Exception as e:
        print(f"Connection error: {e}")
    finally:
        if 'audio_handler' in locals():
            audio_handler.stop_streams()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n👋 Program terminated by user.")
