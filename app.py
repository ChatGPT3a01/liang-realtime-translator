import os
import sys
import asyncio
import threading
import queue
import logging

# 確保本檔所在目錄在 import 路徑上 (環境可能啟用 PYTHONSAFEPATH)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from flask import Flask, render_template, request, jsonify, send_from_directory
from flask_socketio import SocketIO, emit
from dotenv import load_dotenv
from google import genai

import providers

# Load Env with override
load_dotenv(override=True)
# 有效金鑰解析：優先環境變數 GEMINI_API_KEY，其次 .env 的 GOOGLE_API_KEY
API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
if API_KEY:
    print(f"🔑 API Key loaded (starts with): {API_KEY[:6]}...")
else:
    print("❌ API Key NOT found! (set GEMINI_API_KEY or GOOGLE_API_KEY)")

# App Setup
app = Flask(__name__)
app.config['SECRET_KEY'] = 'gemini_secret!'
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Gemini Live realtime 模型 (即時語音對話模式)
# gemini-3.1-flash-live-preview 為原生語音模型，只支援 AUDIO 輸出
LIVE_MODEL = "gemini-3.1-flash-live-preview"

# Session Storage: Key: sid, Value: GeminiSession
active_sessions = {}


class GeminiSession:
    """Gemini Live 即時語音串流 (招牌『即時模式』)。"""

    def __init__(self, sid, instructions):
        self.sid = sid
        self.instructions = instructions
        self.audio_in_queue = queue.Queue()
        self.stop_event = threading.Event()
        self.thread = None
        self.client = genai.Client(api_key=API_KEY, http_options={'api_version': 'v1alpha'})

    def start(self):
        self.thread = threading.Thread(target=self.run_loop)
        self.thread.start()

    def stop(self):
        self.stop_event.set()
        if self.thread:
            self.thread.join(timeout=2)

    def add_audio(self, audio_data):
        self.audio_in_queue.put(audio_data)

    def run_loop(self):
        asyncio.run(self.async_process())

    async def async_process(self):
        config = {
            "response_modalities": ["AUDIO"],           # 原生語音模型只支援 AUDIO
            "system_instruction": self.instructions,
            "output_audio_transcription": {},            # 同時取得字幕文字
        }
        try:
            async with self.client.aio.live.connect(model=LIVE_MODEL, config=config) as session:
                logger.info(f"Session {self.sid} connected to Gemini Live.")
                sender_task = asyncio.create_task(self.sender(session))
                receiver_task = asyncio.create_task(self.receiver(session))

                while not self.stop_event.is_set():
                    if receiver_task.done():
                        receiver_task = asyncio.create_task(self.receiver(session))
                    if sender_task.done() and not sender_task.cancelled():
                        exc = sender_task.exception() if not sender_task.cancelled() else None
                        if exc:
                            logger.error(f"Sender task died: {exc}")
                            sender_task = asyncio.create_task(self.sender(session))
                    await asyncio.sleep(0.1)

                sender_task.cancel()
                receiver_task.cancel()
        except Exception as e:
            logger.error(f"Gemini connection error: {e}")
            socketio.emit('error', {'msg': str(e)}, to=self.sid)

    async def sender(self, session):
        while True:
            try:
                if not self.audio_in_queue.empty():
                    chunk = self.audio_in_queue.get()
                    from google.genai.types import Blob
                    audio_blob = Blob(data=chunk, mime_type="audio/pcm")
                    await session.send_realtime_input(audio=audio_blob)
                else:
                    await asyncio.sleep(0.01)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Sender Error: {e}")
                await asyncio.sleep(0.1)

    async def receiver(self, session):
        try:
            async for response in session.receive():
                if self.stop_event.is_set():
                    break
                server_content = response.server_content
                if server_content is not None:
                    # 字幕（原生語音的逐字轉錄）
                    ot = getattr(server_content, 'output_transcription', None)
                    if ot is not None and getattr(ot, 'text', None):
                        socketio.emit('text_response', {'text': ot.text}, to=self.sid)
                    model_turn = server_content.model_turn
                    if model_turn is not None:
                        for part in model_turn.parts:
                            inline = getattr(part, 'inline_data', None)
                            if inline is not None and inline.data:
                                socketio.emit('audio_response', inline.data, to=self.sid)   # 24kHz PCM 語音
                            elif getattr(part, 'text', None):
                                socketio.emit('text_response', {'text': part.text}, to=self.sid)
                    if server_content.turn_complete:
                        socketio.emit('turn_complete', to=self.sid)
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"Receiver Error: {e}")
            socketio.emit('error', {'msg': str(e)}, to=self.sid)


# --- Flask Routes ---
@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/health')
def health():
    return jsonify({
        "ok": True,
        "gemini_key": bool(API_KEY),
        "live_model": LIVE_MODEL,
    })


@app.route('/api/translate', methods=['POST'])
def api_translate():
    """通用翻譯端點：支援 OpenAI 相容 / Gemini。前端傳供應商設定，後端代理。"""
    data = request.get_json(force=True, silent=True) or {}
    result = providers.translate(data)
    status = 200 if result.get("ok") else 400
    return jsonify(result), status


# 雲端 TTS：用 Gemini 原生語音朗讀「任何語言」，不依賴手機內建語音包
TTS_MODEL = "gemini-2.5-flash-preview-tts"


@app.route('/api/tts', methods=['POST'])
def api_tts():
    from flask import Response
    data = request.get_json(force=True, silent=True) or {}
    text = (data.get('text') or '').strip()
    if not text:
        return ('', 204)
    if not API_KEY:
        return jsonify({'error': 'no gemini key'}), 400
    try:
        from google.genai import types
        client = genai.Client(api_key=API_KEY)
        resp = client.models.generate_content(
            model=TTS_MODEL,
            contents=text,
            config=types.GenerateContentConfig(
                response_modalities=['AUDIO'],
                speech_config=types.SpeechConfig(
                    voice_config=types.VoiceConfig(
                        prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name='Kore')
                    )
                ),
            ),
        )
        audio = resp.candidates[0].content.parts[0].inline_data.data  # 24kHz 16-bit PCM
        return Response(audio, mimetype='application/octet-stream')
    except Exception as e:
        logger.error(f"TTS error: {e}")
        return jsonify({'error': str(e)}), 400


# PWA：manifest 與 service worker 需從根路徑提供
@app.route('/manifest.json')
def manifest():
    return send_from_directory('static', 'manifest.json', mimetype='application/manifest+json')


@app.route('/sw.js')
def service_worker():
    resp = send_from_directory('static', 'sw.js', mimetype='application/javascript')
    resp.headers['Service-Worker-Allowed'] = '/'
    return resp


# --- SocketIO Events (Gemini Live 即時模式) ---
@socketio.on('connect')
def handle_connect():
    logger.info(f"Client connected: {request.sid}")


@socketio.on('disconnect')
def handle_disconnect():
    sid = request.sid
    if sid in active_sessions:
        active_sessions[sid].stop()
        del active_sessions[sid]
    logger.info(f"Client disconnected: {sid}")


@socketio.on('start_session')
def handle_start(data):
    sid = request.sid
    langA = data.get('langA', 'Chinese')
    langB = data.get('langB', 'English')
    instruction = (
        f"You are a real-time voice translator. Your ONLY job is to translate speech.\n"
        f"- When you hear {langA}, translate it to {langB} and reply in {langB}.\n"
        f"- When you hear {langB}, translate it to {langA} and reply in {langA}.\n"
        f"Rules: Output ONLY the translation. No greeting or explanation. Speak naturally."
    )
    logger.info(f"Starting Live session: {langA} <-> {langB}")
    if sid in active_sessions:
        active_sessions[sid].stop()
    session = GeminiSession(sid, instruction)
    active_sessions[sid] = session
    session.start()
    emit('status', {'msg': 'Session Started'})


@socketio.on('stop_session')
def handle_stop():
    sid = request.sid
    if sid in active_sessions:
        active_sessions[sid].stop()
        del active_sessions[sid]


@socketio.on('audio_in')
def handle_audio(data):
    sid = request.sid
    if sid in active_sessions:
        active_sessions[sid].add_audio(data)


if __name__ == '__main__':
    if not API_KEY:
        print("⚠️  無 Gemini 金鑰：即時模式與 Gemini 翻譯將無法使用，但 OpenAI 相容供應商仍可用。")
    port = int(os.getenv('PORT', '5001'))          # 雲端平台會用 PORT 環境變數指定埠號
    debug = os.getenv('FLASK_DEBUG', '0') == '1'    # 公開部署預設關閉 debug
    print(f"🚀 Starting Flask Server on port {port} (debug={debug})")
    socketio.run(app, host='0.0.0.0', port=port, debug=debug, allow_unsafe_werkzeug=True)
