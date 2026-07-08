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


# 上傳檔案翻譯：支援 圖片 / PDF / 純文字檔
MAX_FILE_BYTES = 15 * 1024 * 1024   # 15MB
IMAGE_EXTS = {'jpg', 'jpeg', 'png', 'webp', 'heic', 'heif', 'gif'}


def _provider_cfg(src):
    """從 request (json 或 form) 取出供應商設定。"""
    provider = (src.get('provider') or 'gemini').lower()
    return {
        'provider': provider,
        'base_url': src.get('base_url') or '',
        'api_key': src.get('api_key') or '',
        'model': src.get('model') or '',
    }


def _run_analyze(pc, target, force_gemini=False, **kw):
    """
    依供應商設定執行 providers.analyze，統一處理金鑰解析與錯誤。
    force_gemini=True 時（例如 PDF）強制走伺服器 Gemini 金鑰。
    回傳 (result_dict, status_code)。
    """
    provider = pc['provider']
    note = None
    if force_gemini and provider != 'gemini':
        provider = 'gemini'
        note = 'PDF 不支援所選供應商，已自動改用 Gemini 雲端辨識'

    try:
        if provider == 'openai':
            if not pc['api_key']:
                return {"ok": False, "error": "OpenAI 相容供應商需要 API Key（請到設定填入）"}, 400
            result = providers.analyze('openai', pc['api_key'], pc['model'], target,
                                       base_url=pc['base_url'], **kw)
        else:  # gemini
            key = (pc['api_key'] if pc['provider'] == 'gemini' else '') or API_KEY
            if not key:
                return {"ok": False, "error": "找不到 Gemini API Key"}, 400
            model = pc['model'] if pc['provider'] == 'gemini' else ''
            result = providers.analyze('gemini', key, model, target, **kw)
    except requests.HTTPError as e:
        body = ''
        try:
            body = e.response.text[:300]
        except Exception:
            pass
        return {"ok": False, "error": f"HTTP {e.response.status_code if e.response else '?'}: {body}"}, 400
    except Exception as e:
        logger.error(f"analyze error: {e}")
        return {"ok": False, "error": f"{type(e).__name__}: {e}"}, 400

    out = {"ok": True, **result}
    if note:
        out["note"] = note
    return out, 200


@app.route('/api/vision', methods=['POST'])
def api_vision():
    """相機拍照 → 摘要 + 翻譯。前端傳 base64 影像（可含 dataURL 前綴）+ 供應商設定。"""
    import base64 as _b64
    data = request.get_json(force=True, silent=True) or {}
    image_b64 = data.get('image') or ''
    target = data.get('target') or 'Traditional Chinese (Taiwan)'
    if not image_b64:
        return jsonify({"ok": False, "error": "no image"}), 400

    mime = 'image/jpeg'
    if image_b64.startswith('data:'):
        try:
            header, image_b64 = image_b64.split(',', 1)
            mime = header.split(':', 1)[1].split(';', 1)[0] or mime
        except Exception:
            pass
    try:
        raw = _b64.b64decode(image_b64)
    except Exception:
        return jsonify({"ok": False, "error": "影像解碼失敗"}), 400

    pc = _provider_cfg(data)
    result, status = _run_analyze(pc, target, file_bytes=raw, mime_type=mime)
    return jsonify(result), status


@app.route('/api/file', methods=['POST'])
def api_file():
    """上傳檔案 → 摘要 + 翻譯。支援 image/* 、application/pdf 、text/plain。PDF 一律走 Gemini。"""
    f = request.files.get('file')
    target = request.form.get('target') or 'Traditional Chinese (Taiwan)'
    if not f:
        return jsonify({"ok": False, "error": "no file"}), 400

    filename = f.filename or 'upload'
    raw = f.read()
    if not raw:
        return jsonify({"ok": False, "error": "空白檔案"}), 400
    if len(raw) > MAX_FILE_BYTES:
        return jsonify({"ok": False, "error": "檔案過大（上限 15MB）"}), 400

    mime = (f.mimetype or '').lower()
    ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''
    pc = _provider_cfg(request.form)

    if mime == 'text/plain' or ext in ('txt', 'md', 'csv'):
        text = raw.decode('utf-8', errors='replace')
        result, status = _run_analyze(pc, target, text=text)
    elif mime == 'application/pdf' or ext == 'pdf':
        # PDF 只有 Gemini 能原生讀取 → 強制回退 Gemini
        result, status = _run_analyze(pc, target, force_gemini=True,
                                      file_bytes=raw, mime_type='application/pdf')
    elif mime.startswith('image/') or ext in IMAGE_EXTS:
        if not mime.startswith('image/'):
            mime = 'image/jpeg'
        result, status = _run_analyze(pc, target, file_bytes=raw, mime_type=mime)
    else:
        return jsonify({"ok": False, "error": f"不支援的檔案類型：{mime or ext or '未知'}"}), 400

    if isinstance(result, dict):
        result.setdefault("filename", filename)
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

    from google.genai import types
    client = genai.Client(api_key=API_KEY)
    cfg = types.GenerateContentConfig(
        response_modalities=['AUDIO'],
        speech_config=types.SpeechConfig(
            voice_config=types.VoiceConfig(
                prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name='Kore')
            )
        ),
    )
    # 預覽版 TTS 模型偶爾會「吐文字而非音訊」導致 400 → 重試最多 3 次
    last_err = 'unknown'
    for _attempt in range(3):
        try:
            resp = client.models.generate_content(model=TTS_MODEL, contents=text, config=cfg)
            for part in resp.candidates[0].content.parts:
                inline = getattr(part, 'inline_data', None)
                if inline is not None and inline.data:
                    return Response(inline.data, mimetype='application/octet-stream')  # 24kHz 16-bit PCM
            last_err = 'model returned text instead of audio'
        except Exception as e:
            last_err = str(e)
    logger.error(f"TTS failed after retries: {last_err}")
    return jsonify({'error': last_err}), 400


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
