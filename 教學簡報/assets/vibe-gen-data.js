/* ============================================================
   Vibe 逐段生成器 · 資料檔（自動產生，請勿手改）
   由 _ckpt_work/gen_vibe.py 產生：每段 code 逐字取自 app.py / providers.py，
   確保學員一塊塊疊出來的檔案與老師成品一致。
   ============================================================ */
window.VIBE_GENERATORS = {
  "app_ch04": {
    "file": "app.py",
    "title": "Flask 後端骨架",
    "intro": "先把伺服器的「地基」打好：能開機、有首頁、有健康檢查。之後每一章都疊在這上面。",
    "goals": [
      {
        "title": "打好伺服器地基",
        "note": "匯入需要的工具、建立 Flask 應用程式、把即時語音之後會用到的設定先準備好。",
        "prompt": "我要用 Python 的 Flask 做一個網站後端，檔名 app.py。\n幫我把最開頭的「地基」準備好：\n1. 匯入之後會用到的基本工具。\n2. 讀取 .env 裡的 API 金鑰。\n3. 建立 Flask 應用程式，並開啟即時通訊（SocketIO）。\n我是新手，請每個地方都加上清楚的中文註解。",
        "code": "import os\nimport sys\nimport asyncio\nimport threading\nimport queue\nimport logging\nimport requests\n\n# 確保本檔所在目錄在 import 路徑上 (環境可能啟用 PYTHONSAFEPATH)\nsys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))\n\nfrom flask import Flask, render_template, request, jsonify, send_from_directory\nfrom flask_socketio import SocketIO, emit\nfrom dotenv import load_dotenv\nfrom google import genai\n\nimport providers\n\n# Load Env with override\nload_dotenv(override=True)\n# 有效金鑰解析：優先環境變數 GEMINI_API_KEY，其次 .env 的 GOOGLE_API_KEY\nAPI_KEY = os.getenv(\"GEMINI_API_KEY\") or os.getenv(\"GOOGLE_API_KEY\")\nif API_KEY:\n    print(f\"🔑 API Key loaded (starts with): {API_KEY[:6]}...\")\nelse:\n    print(\"❌ API Key NOT found! (set GEMINI_API_KEY or GOOGLE_API_KEY)\")\n\n# App Setup\napp = Flask(__name__)\napp.config['SECRET_KEY'] = 'gemini_secret!'\nsocketio = SocketIO(app, cors_allowed_origins=\"*\", async_mode='threading')\n\n# Logging\nlogging.basicConfig(level=logging.INFO)\nlogger = logging.getLogger(__name__)\n\n# Gemini Live realtime 模型 (即時語音對話模式)\n# gemini-3.5-live-translate-preview：3.5、專為即時翻譯設計，原生語音 AUDIO 輸出\n# （若即時翻譯品質或行為異常，可回退 gemini-3.1-flash-live-preview）\nLIVE_MODEL = \"gemini-3.5-live-translate-preview\"\n\n# Session Storage: Key: sid, Value: GeminiSession\nactive_sessions = {}"
      },
      {
        "title": "做一個首頁",
        "note": "有人打開網站時，回傳我們的前端頁面。",
        "prompt": "幫我加一個「首頁」路由：當有人打開網站根目錄時，回傳前端頁面 index.html。請加中文註解。",
        "code": "@app.route('/')\ndef index():\n    return render_template('index.html')"
      },
      {
        "title": "做一個健康檢查",
        "note": "一個可以確認伺服器活著、金鑰有沒有讀到的檢查點。",
        "prompt": "幫我加一個 /api/health 的檢查路由，回傳一個 JSON，讓我能確認伺服器正常運作、以及有沒有讀到金鑰。請加中文註解。",
        "code": "@app.route('/api/health')\ndef health():\n    return jsonify({\n        \"ok\": True,\n        \"gemini_key\": bool(API_KEY),\n        \"live_model\": LIVE_MODEL,\n    })"
      },
      {
        "title": "讓伺服器可以啟動",
        "note": "加上啟動程式，本機和雲端都能跑起來。",
        "prompt": "最後幫我加上「啟動伺服器」的程式：本機用預設埠號，雲端則讀環境變數的 PORT。請加中文註解。",
        "code": "if __name__ == '__main__':\n    if not API_KEY:\n        print(\"⚠️  無 Gemini 金鑰：即時模式與 Gemini 翻譯將無法使用，但 OpenAI 相容供應商仍可用。\")\n    port = int(os.getenv('PORT', '5001'))          # 雲端平台會用 PORT 環境變數指定埠號\n    debug = os.getenv('FLASK_DEBUG', '0') == '1'    # 公開部署預設關閉 debug\n    print(f\"🚀 Starting Flask Server on port {port} (debug={debug})\")\n    socketio.run(app, host='0.0.0.0', port=port, debug=debug, allow_unsafe_werkzeug=True)"
      }
    ]
  },
  "providers_ch06": {
    "file": "providers.py",
    "title": "翻譯供應商層",
    "intro": "這個檔案負責「真的去翻譯」。一塊一塊疊出來，最後就是一個可以切換 Gemini / OpenAI 的翻譯引擎。",
    "goals": [
      {
        "title": "先把檔案的開頭準備好",
        "note": "寫清楚這個檔在做什麼、匯入需要的工具、設定預設模型。",
        "prompt": "我要做一個負責「翻譯」的程式檔，叫 providers.py。\n先幫我把開頭準備好：寫一段說明註解、匯入基本工具、設定預設要用的翻譯模型。\n我是新手，請每個地方都加上中文註解。",
        "code": "\"\"\"\n翻譯供應商抽象層 (Translation Provider Layer)\n-------------------------------------------------\n統一介面，讓前端可以自由切換：\n  - \"openai\"：任何「OpenAI 相容」的服務 (OpenAI / Groq / DeepSeek / OpenRouter / Together / 本機 ...)\n  - \"gemini\"：Google Gemini\n\n前端只送 { provider, base_url, api_key, model, text, source, target }，\n後端在這裡轉發給對應供應商，金鑰不會留在瀏覽器可被第三方讀取的地方 (由 Flask 代理，順便解 CORS)。\n\"\"\"\n\nimport os\nimport json\nimport re\nimport base64\nimport requests\n\nDEFAULT_GEMINI_MODEL = \"gemini-3.5-flash\"\n# 多模態（圖片 / PDF）分析用模型：gemini-3.5-flash 為 GA 版，原生支援影像與 PDF\nDEFAULT_VISION_MODEL = \"gemini-3.5-flash\""
      },
      {
        "title": "寫一個「產生翻譯指令」的小功能",
        "note": "告訴 AI：把 A 語言翻成 B 語言，只回翻譯、不要多餘的話。",
        "prompt": "幫我寫一個小功能，用來「產生要給 AI 的翻譯指令」：\n輸入來源語言和目標語言，回傳一句話告訴 AI 只回翻譯後的文字、不要解釋。\n如果來源語言設成「自動」，就讓 AI 自己判斷語言再翻。請加中文註解。",
        "code": "def build_prompt(source: str, target: str):\n    \"\"\"產生翻譯用的 system 指令與使用者輸入包裝。\"\"\"\n    if source and source.lower() == \"auto\":\n        system = (\n            \"You are a professional real-time translation engine for a two-way conversation. \"\n            f\"Detect the language of the input. If it is {target}, translate it into the other party's language; \"\n            f\"otherwise translate it into {target}. \"\n            \"Output ONLY the translated text — no explanations, no language labels, no quotation marks.\"\n        )\n    else:\n        system = (\n            f\"You are a professional translation engine. Translate the text from {source} into {target}. \"\n            \"Output ONLY the translated text — no explanations, no language labels, no quotation marks. \"\n            \"Preserve the tone and meaning; make it sound natural to a native speaker.\"\n        )\n    return system"
      },
      {
        "title": "接上 Google Gemini，真的去翻譯",
        "note": "把文字送給 Gemini，拿回翻譯後的文字。",
        "prompt": "幫我寫一個功能，把要翻譯的文字送給 Google 的 Gemini，拿回翻譯後的文字。\n金鑰、模型、翻譯指令、要翻的文字都由外面傳進來。請加中文註解。",
        "code": "def translate_gemini(api_key: str, model: str, system: str, text: str) -> str:\n    \"\"\"呼叫 Google Gemini 的 generate_content。\"\"\"\n    from google import genai\n    from google.genai import types\n\n    client = genai.Client(api_key=api_key)\n    resp = client.models.generate_content(\n        model=model or DEFAULT_GEMINI_MODEL,\n        contents=text,\n        config=types.GenerateContentConfig(\n            system_instruction=system,\n            temperature=0.3,\n        ),\n    )\n    return (resp.text or \"\").strip()"
      },
      {
        "title": "再多支援 OpenAI / Groq 這類服務",
        "note": "同樣把文字送出去拿回翻譯，讓引擎可以自由換家。",
        "prompt": "我還想支援 OpenAI、Groq 這類服務。幫我寫一個功能，用同樣方式把文字送給「OpenAI 相容」的服務拿回翻譯。\n網址、金鑰、模型都由外面傳進來；沒給網址就用 OpenAI 官方網址。請加中文註解。",
        "code": "def translate_openai(base_url: str, api_key: str, model: str, system: str, text: str, timeout: int = 30) -> str:\n    \"\"\"呼叫 OpenAI 相容的 /chat/completions 端點。\"\"\"\n    if not base_url:\n        base_url = \"https://api.openai.com/v1\"\n    url = base_url.rstrip(\"/\")\n    if not url.endswith(\"/chat/completions\"):\n        url = url + \"/chat/completions\"\n\n    headers = {\"Authorization\": f\"Bearer {api_key}\", \"Content-Type\": \"application/json\"}\n    # 注意：部分新模型（如 gpt-5.x）只支援預設 temperature，故不傳 temperature 參數\n    payload = {\n        \"model\": model or \"gpt-5.5\",\n        \"messages\": [\n            {\"role\": \"system\", \"content\": system},\n            {\"role\": \"user\", \"content\": text},\n        ],\n    }\n    r = requests.post(url, headers=headers, json=payload, timeout=timeout)\n    r.raise_for_status()\n    data = r.json()\n    return data[\"choices\"][0][\"message\"][\"content\"].strip()"
      },
      {
        "title": "最後做一個「總入口」把大家串起來",
        "note": "收資料 → 檢查 → 產生指令 → 依指定的那一家翻 → 回結果或清楚的錯誤。",
        "prompt": "最後幫我寫一個總入口功能 translate：外面會給我一包資料（要翻的文字、來源語言、目標語言、要用哪一家、金鑰等）。\n先檢查文字不是空的，產生翻譯指令，再依指定的那一家去翻；成功回傳翻譯結果，失敗回傳看得懂的錯誤。請加中文註解。",
        "code": "def translate(data: dict) -> dict:\n    \"\"\"\n    主入口。data 需含：\n      provider: \"openai\" | \"gemini\"\n      text:     要翻譯的文字\n      source:   來源語言 (英文名，或 \"auto\")\n      target:   目標語言 (英文名)\n      base_url / api_key / model：供應商設定 (openai 必填 key；gemini 可用伺服器 .env 的 key 當後備)\n    回傳 { ok, translation } 或 { ok:false, error }\n    \"\"\"\n    provider = (data.get(\"provider\") or \"gemini\").lower()\n    text = (data.get(\"text\") or \"\").strip()\n    source = data.get(\"source\") or \"auto\"\n    target = data.get(\"target\") or \"English\"\n\n    if not text:\n        return {\"ok\": False, \"error\": \"empty text\"}\n\n    system = build_prompt(source, target)\n\n    try:\n        if provider == \"openai\":\n            api_key = data.get(\"api_key\") or \"\"\n            if not api_key:\n                return {\"ok\": False, \"error\": \"OpenAI 相容供應商需要 API Key\"}\n            out = translate_openai(\n                base_url=data.get(\"base_url\", \"\"),\n                api_key=api_key,\n                model=data.get(\"model\", \"\"),\n                system=system,\n                text=text,\n            )\n        else:  # gemini\n            api_key = data.get(\"api_key\") or os.getenv(\"GEMINI_API_KEY\") or os.getenv(\"GOOGLE_API_KEY\") or \"\"\n            if not api_key:\n                return {\"ok\": False, \"error\": \"找不到 Gemini API Key（.env 或設定皆無）\"}\n            out = translate_gemini(\n                api_key=api_key,\n                model=data.get(\"model\", \"\"),\n                system=system,\n                text=text,\n            )\n        return {\"ok\": True, \"translation\": out, \"provider\": provider}\n    except requests.HTTPError as e:\n        body = \"\"\n        try:\n            body = e.response.text[:300]\n        except Exception:\n            pass\n        return {\"ok\": False, \"error\": f\"HTTP {e.response.status_code if e.response else '?'}: {body}\"}\n    except Exception as e:\n        return {\"ok\": False, \"error\": f\"{type(e).__name__}: {e}\"}"
      }
    ]
  },
  "app_ch06": {
    "file": "app.py",
    "title": "翻譯 API 路由",
    "intro": "前端會把文字送到後端，我們加一個路由把它交給剛剛的翻譯引擎。",
    "goals": [
      {
        "title": "加一個「翻譯」API 路由",
        "note": "收前端送來的文字，交給 providers 翻譯，再把結果回傳。",
        "prompt": "幫我在後端加一個 /api/translate 路由（POST）：收下前端送來的資料，\n交給我剛剛寫好的翻譯功能處理，成功回傳翻譯結果、失敗回傳錯誤。請加中文註解。",
        "code": "@app.route('/api/translate', methods=['POST'])\ndef api_translate():\n    \"\"\"通用翻譯端點：支援 OpenAI 相容 / Gemini。前端傳供應商設定，後端代理。\"\"\"\n    data = request.get_json(force=True, silent=True) or {}\n    result = providers.translate(data)\n    status = 200 if result.get(\"ok\") else 400\n    return jsonify(result), status"
      }
    ]
  },
  "app_ch08": {
    "file": "app.py",
    "title": "雲端朗讀 TTS",
    "intro": "讓 App 用雲端語音把任何語言念出來，不必依賴手機內建語音包。",
    "goals": [
      {
        "title": "先設定要用的語音模型",
        "note": "指定一個雲端 TTS 模型。",
        "prompt": "我要做「用雲端語音把文字念出來」的功能。先幫我設定要用哪一個 Gemini 語音模型。請加中文註解。",
        "code": "# 雲端 TTS：用 Gemini 原生語音朗讀「任何語言」，不依賴手機內建語音包\n# 用帳號可用的最新 TTS 模型（2.5 preview 已偏舊，改用 3.1）\nTTS_MODEL = \"gemini-3.1-flash-tts-preview\""
      },
      {
        "title": "做一個雲端朗讀 API",
        "note": "收文字 → 送給語音模型 → 回傳語音資料；偶爾失敗會自動重試。",
        "prompt": "幫我做一個 /api/tts 路由（POST）：收下文字，送給語音模型產生語音，回傳語音資料。\n因為預覽版模型偶爾會出錯，請加上「最多重試 3 次」。請加中文註解。",
        "code": "@app.route('/api/tts', methods=['POST'])\ndef api_tts():\n    from flask import Response\n    data = request.get_json(force=True, silent=True) or {}\n    text = (data.get('text') or '').strip()\n    if not text:\n        return ('', 204)\n    key = (data.get('gemini_key') or '').strip() or API_KEY   # 選填覆蓋，留空用伺服器內建\n    if not key:\n        return jsonify({'error': 'no gemini key'}), 400\n\n    from google.genai import types\n    client = genai.Client(api_key=key)\n    cfg = types.GenerateContentConfig(\n        response_modalities=['AUDIO'],\n        speech_config=types.SpeechConfig(\n            voice_config=types.VoiceConfig(\n                prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name='Kore')\n            )\n        ),\n    )\n    # 預覽版 TTS 模型偶爾會「吐文字而非音訊」導致 400 → 重試最多 3 次\n    last_err = 'unknown'\n    for _attempt in range(3):\n        try:\n            resp = client.models.generate_content(model=TTS_MODEL, contents=text, config=cfg)\n            for part in resp.candidates[0].content.parts:\n                inline = getattr(part, 'inline_data', None)\n                if inline is not None and inline.data:\n                    return Response(inline.data, mimetype='application/octet-stream')  # 24kHz 16-bit PCM\n            last_err = 'model returned text instead of audio'\n        except Exception as e:\n            last_err = str(e)\n    logger.error(f\"TTS failed after retries: {last_err}\")\n    return jsonify({'error': last_err}), 400"
      }
    ]
  },
  "app_ch09": {
    "file": "app.py",
    "title": "Gemini Live 即時語音",
    "intro": "招牌「即時模式」：邊說邊翻、原生語音。我們做一個即時語音的核心引擎，再接上連線事件。",
    "goals": [
      {
        "title": "做即時語音的核心引擎",
        "note": "一個負責跟 Gemini Live 串流語音、收發音訊與字幕的類別。",
        "prompt": "我要做「即時語音翻譯」：使用者一邊說、AI 一邊用語音翻出來。\n幫我寫一個核心類別，負責跟 Gemini 的即時語音服務保持連線，\n把麥克風的聲音送過去、把翻譯後的語音和字幕收回來。這比較進階，請務必每段都加中文註解。",
        "code": "class GeminiSession:\n    \"\"\"Gemini Live 即時語音串流 (招牌『即時模式』)。\"\"\"\n\n    def __init__(self, sid, instructions, api_key=None):\n        self.sid = sid\n        self.instructions = instructions\n        self.audio_in_queue = queue.Queue()\n        self.stop_event = threading.Event()\n        self.thread = None\n        self.client = genai.Client(api_key=(api_key or API_KEY), http_options={'api_version': 'v1alpha'})\n\n    def start(self):\n        self.thread = threading.Thread(target=self.run_loop)\n        self.thread.start()\n\n    def stop(self):\n        self.stop_event.set()\n        if self.thread:\n            self.thread.join(timeout=2)\n\n    def add_audio(self, audio_data):\n        self.audio_in_queue.put(audio_data)\n\n    def run_loop(self):\n        asyncio.run(self.async_process())\n\n    async def async_process(self):\n        config = {\n            \"response_modalities\": [\"AUDIO\"],           # 原生語音模型只支援 AUDIO\n            \"system_instruction\": self.instructions,\n            \"output_audio_transcription\": {},            # 同時取得字幕文字\n        }\n        try:\n            async with self.client.aio.live.connect(model=LIVE_MODEL, config=config) as session:\n                logger.info(f\"Session {self.sid} connected to Gemini Live.\")\n                sender_task = asyncio.create_task(self.sender(session))\n                receiver_task = asyncio.create_task(self.receiver(session))\n\n                while not self.stop_event.is_set():\n                    if receiver_task.done():\n                        receiver_task = asyncio.create_task(self.receiver(session))\n                    if sender_task.done() and not sender_task.cancelled():\n                        exc = sender_task.exception() if not sender_task.cancelled() else None\n                        if exc:\n                            logger.error(f\"Sender task died: {exc}\")\n                            sender_task = asyncio.create_task(self.sender(session))\n                    await asyncio.sleep(0.1)\n\n                sender_task.cancel()\n                receiver_task.cancel()\n        except Exception as e:\n            logger.error(f\"Gemini connection error: {e}\")\n            socketio.emit('error', {'msg': str(e)}, to=self.sid)\n\n    async def sender(self, session):\n        while True:\n            try:\n                if not self.audio_in_queue.empty():\n                    chunk = self.audio_in_queue.get()\n                    from google.genai.types import Blob\n                    audio_blob = Blob(data=chunk, mime_type=\"audio/pcm\")\n                    await session.send_realtime_input(audio=audio_blob)\n                else:\n                    await asyncio.sleep(0.01)\n            except asyncio.CancelledError:\n                break\n            except Exception as e:\n                logger.error(f\"Sender Error: {e}\")\n                await asyncio.sleep(0.1)\n\n    async def receiver(self, session):\n        try:\n            async for response in session.receive():\n                if self.stop_event.is_set():\n                    break\n                server_content = response.server_content\n                if server_content is not None:\n                    # 字幕（原生語音的逐字轉錄）\n                    ot = getattr(server_content, 'output_transcription', None)\n                    if ot is not None and getattr(ot, 'text', None):\n                        socketio.emit('text_response', {'text': ot.text}, to=self.sid)\n                    model_turn = server_content.model_turn\n                    if model_turn is not None:\n                        for part in model_turn.parts:\n                            inline = getattr(part, 'inline_data', None)\n                            if inline is not None and inline.data:\n                                socketio.emit('audio_response', inline.data, to=self.sid)   # 24kHz PCM 語音\n                            elif getattr(part, 'text', None):\n                                socketio.emit('text_response', {'text': part.text}, to=self.sid)\n                    if server_content.turn_complete:\n                        socketio.emit('turn_complete', to=self.sid)\n        except asyncio.CancelledError:\n            pass\n        except Exception as e:\n            logger.error(f\"Receiver Error: {e}\")\n            socketio.emit('error', {'msg': str(e)}, to=self.sid)"
      },
      {
        "title": "接上即時語音的連線事件",
        "note": "處理使用者連線、開始／結束對話、把麥克風音訊送進引擎。",
        "prompt": "幫我接上即時語音的「連線事件」：有人連上、開始一段對話、送麥克風聲音進來、結束對話時，\n分別要做什麼。請加中文註解。",
        "code": "# --- SocketIO Events (Gemini Live 即時模式) ---\n@socketio.on('connect')\ndef handle_connect():\n    logger.info(f\"Client connected: {request.sid}\")\n\n\n@socketio.on('disconnect')\ndef handle_disconnect():\n    sid = request.sid\n    if sid in active_sessions:\n        active_sessions[sid].stop()\n        del active_sessions[sid]\n    logger.info(f\"Client disconnected: {sid}\")\n\n\n@socketio.on('start_session')\ndef handle_start(data):\n    sid = request.sid\n    langA = data.get('langA', 'Chinese')\n    langB = data.get('langB', 'English')\n    user_key = (data.get('gemini_key') or '').strip() or None   # 選填覆蓋，留空用伺服器內建\n    instruction = (\n        f\"You are a real-time voice translator. Your ONLY job is to translate speech.\\n\"\n        f\"- When you hear {langA}, translate it to {langB} and reply in {langB}.\\n\"\n        f\"- When you hear {langB}, translate it to {langA} and reply in {langA}.\\n\"\n        f\"Rules: Output ONLY the translation. No greeting or explanation. Speak naturally.\"\n    )\n    logger.info(f\"Starting Live session: {langA} <-> {langB}\")\n    if sid in active_sessions:\n        active_sessions[sid].stop()\n    session = GeminiSession(sid, instruction, api_key=user_key)\n    active_sessions[sid] = session\n    session.start()\n    emit('status', {'msg': 'Session Started'})\n\n\n@socketio.on('stop_session')\ndef handle_stop():\n    sid = request.sid\n    if sid in active_sessions:\n        active_sessions[sid].stop()\n        del active_sessions[sid]\n\n\n@socketio.on('audio_in')\ndef handle_audio(data):\n    sid = request.sid\n    if sid in active_sessions:\n        active_sessions[sid].add_audio(data)"
      }
    ]
  },
  "providers_ch11": {
    "file": "providers.py",
    "title": "圖片／檔案分析",
    "intro": "讓翻譯引擎「看得懂圖片和文件」：讀圖 → 摘要 + 翻譯。這一段疊在 providers.py 後面。",
    "goals": [
      {
        "title": "寫一段「看圖說話」的指令",
        "note": "要求 AI 讀懂圖片/文件，輸出摘要和翻譯，並固定用 JSON 回。",
        "prompt": "我要讓 AI 看懂圖片或文件，然後給我「重點摘要」和「完整翻譯」。\n幫我寫一段指令，要求 AI 讀懂內容後，固定用 JSON 格式回傳 summary 和 translation。請加中文註解。",
        "code": "def _vision_system(target_name: str) -> str:\n    \"\"\"產生「摘要 + 翻譯」用的 system 指令，強制 JSON 輸出。\"\"\"\n    return (\n        \"You are a visual & document translation assistant. \"\n        \"The input may be a photo or file containing a menu, sign, form, article, or any text.\\n\"\n        \"Do the following:\\n\"\n        \"1. Read and understand all meaningful text and visual information in the input.\\n\"\n        f\"2. Write a concise, well-organized summary of the key points, written in {target_name}.\\n\"\n        f\"3. Provide a faithful, natural full translation of the text content into {target_name}.\\n\"\n        'Respond with ONLY a JSON object of the exact shape '\n        '{\"summary\": \"...\", \"translation\": \"...\"}. '\n        \"No markdown, no code fences, no extra commentary. \"\n        \"If there is no readable text, explain that in the summary and use an empty string for translation.\"\n    )"
      },
      {
        "title": "把 AI 回來的內容安全地解析出來",
        "note": "容忍 AI 多包了程式碼框、或 JSON 被截斷的情況。",
        "prompt": "AI 回來的 JSON 有時會被包在程式碼框裡、或太長被截斷。\n幫我寫一個功能，盡量把裡面的 summary 和 translation 安全地取出來，就算格式不完美也要能救回來。請加中文註解。",
        "code": "def _parse_json_result(raw: str) -> dict:\n    \"\"\"把 LLM 回傳解析成 {summary, translation}，容忍 code fence 或被截斷的 JSON。\"\"\"\n    raw = (raw or \"\").strip()\n    if raw.startswith(\"```\"):\n        raw = re.sub(r\"^```[a-zA-Z]*\\n?\", \"\", raw)\n        raw = re.sub(r\"\\n?```$\", \"\", raw).strip()\n    try:\n        obj = json.loads(raw)\n        return {\n            \"summary\": (obj.get(\"summary\") or \"\").strip(),\n            \"translation\": (obj.get(\"translation\") or \"\").strip(),\n        }\n    except Exception:\n        pass\n\n    # 容忍截斷（超長文件可能超出輸出上限）：用正則救回 summary / translation 欄位\n    def grab(key):\n        m = re.search(r'\"' + key + r'\"\\s*:\\s*\"((?:[^\"\\\\]|\\\\.)*)', raw)\n        if not m:\n            return \"\"\n        frag = m.group(1)\n        try:\n            return json.loads('\"' + frag + '\"')   # 還原 JSON 跳脫字元\n        except Exception:\n            return frag\n    summary, translation = grab(\"summary\"), grab(\"translation\")\n    if summary or translation:\n        return {\"summary\": summary.strip(), \"translation\": translation.strip()}\n    return {\"summary\": \"\", \"translation\": raw}"
      },
      {
        "title": "用 Gemini 讀圖／PDF",
        "note": "把圖片或 PDF 交給 Gemini 原生讀取。",
        "prompt": "幫我寫一個功能，把圖片或 PDF 交給 Google Gemini 原生讀取，回傳它的分析結果（JSON 字串）。請加中文註解。",
        "code": "def _analyze_gemini(api_key: str, model: str, system: str,\n                    text: str, file_bytes: bytes, mime_type: str) -> str:\n    \"\"\"Gemini 多模態：圖片 / PDF 原生讀取，回傳原始 JSON 字串。\"\"\"\n    from google import genai\n    from google.genai import types\n\n    if model and not model.startswith(\"gemini\"):\n        model = \"\"   # 避免把 OpenAI 模型名誤送給 Gemini\n\n    client = genai.Client(api_key=api_key)\n    parts = []\n    if file_bytes is not None:\n        parts.append(types.Part.from_bytes(data=file_bytes, mime_type=mime_type or \"application/octet-stream\"))\n    if text:\n        parts.append(text)\n    if not parts:\n        return \"\"\n\n    resp = client.models.generate_content(\n        model=model or DEFAULT_VISION_MODEL,\n        contents=parts,\n        config=types.GenerateContentConfig(\n            system_instruction=system,\n            temperature=0.3,\n            response_mime_type=\"application/json\",\n            max_output_tokens=8192,\n            # 關閉 thinking：OCR/摘要/翻譯不需推理，且能避免思考 token 吃掉輸出額度導致 JSON 被截斷\n            thinking_config=types.ThinkingConfig(thinking_budget=0),\n        ),\n    )\n    return resp.text or \"\""
      },
      {
        "title": "用 OpenAI 相容服務讀圖",
        "note": "把圖片轉成 data URL 交給 OpenAI 相容的視覺模型。",
        "prompt": "幫我寫一個功能，把圖片交給「OpenAI 相容」的視覺模型分析，回傳結果。請加中文註解。",
        "code": "def _analyze_openai(base_url: str, api_key: str, model: str, system: str,\n                    text: str, file_bytes: bytes, mime_type: str, timeout: int = 90) -> str:\n    \"\"\"OpenAI 相容多模態（vision）：圖片以 data URL 塞進 content，回傳原始 JSON 字串。\"\"\"\n    if not base_url:\n        base_url = \"https://api.openai.com/v1\"\n    url = base_url.rstrip(\"/\")\n    if not url.endswith(\"/chat/completions\"):\n        url = url + \"/chat/completions\"\n\n    content = []\n    if text:\n        content.append({\"type\": \"text\", \"text\": text})\n    if file_bytes is not None:\n        b64 = base64.b64encode(file_bytes).decode()\n        data_url = f\"data:{mime_type or 'image/jpeg'};base64,{b64}\"\n        content.append({\"type\": \"image_url\", \"image_url\": {\"url\": data_url}})\n    if not content:\n        content = [{\"type\": \"text\", \"text\": \"\"}]\n\n    headers = {\"Authorization\": f\"Bearer {api_key}\", \"Content-Type\": \"application/json\"}\n    # 不傳 temperature / max_tokens：盡量相容各家 (OpenAI/Groq/DeepSeek/OpenRouter…)；截斷由解析器容錯\n    payload = {\n        \"model\": model or \"gpt-5.5\",\n        \"messages\": [\n            {\"role\": \"system\", \"content\": system},\n            {\"role\": \"user\", \"content\": content},\n        ],\n    }\n    r = requests.post(url, headers=headers, json=payload, timeout=timeout)\n    r.raise_for_status()\n    data = r.json()\n    return data[\"choices\"][0][\"message\"][\"content\"] or \"\""
      },
      {
        "title": "做一個分析總入口",
        "note": "依供應商選 Gemini 或 OpenAI，回傳解析好的摘要與翻譯。",
        "prompt": "最後幫我寫一個分析總入口 analyze：依照指定的供應商去讀圖/檔案，\n再把結果解析成乾淨的「摘要 + 翻譯」回傳。請加中文註解。",
        "code": "def analyze(provider: str, api_key: str, model: str, target_name: str,\n            base_url: str = \"\", text: str = None,\n            file_bytes: bytes = None, mime_type: str = None) -> dict:\n    \"\"\"\n    多模態分析 → {summary, translation}，依 provider 走 Gemini 或 OpenAI 相容。\n      - file_bytes + mime_type：圖片 (或 PDF，僅 Gemini 支援原生讀取)\n      - text：純文字內容\n    \"\"\"\n    system = _vision_system(target_name)\n    provider = (provider or \"gemini\").lower()\n    if provider == \"openai\":\n        raw = _analyze_openai(base_url, api_key, model, system, text, file_bytes, mime_type)\n    else:\n        raw = _analyze_gemini(api_key, model, system, text, file_bytes, mime_type)\n    return _parse_json_result(raw)"
      }
    ]
  },
  "app_ch11": {
    "file": "app.py",
    "title": "拍照翻譯 API",
    "intro": "接上前端的相機：把拍到的照片送到後端分析，回傳摘要和翻譯。",
    "goals": [
      {
        "title": "取出供應商設定的小幫手",
        "note": "把前端傳來的供應商、金鑰、模型整理成一包。",
        "prompt": "幫我寫一個小幫手，把前端送來的「要用哪一家、網址、金鑰、模型」整理成一包好用的設定。請加中文註解。",
        "code": "def _provider_cfg(src):\n    \"\"\"從 request (json 或 form) 取出供應商設定。\"\"\"\n    provider = (src.get('provider') or 'gemini').lower()\n    return {\n        'provider': provider,\n        'base_url': src.get('base_url') or '',\n        'api_key': src.get('api_key') or '',\n        'model': src.get('model') or '',\n    }"
      },
      {
        "title": "統一處理分析與錯誤",
        "note": "依供應商執行分析、處理金鑰、把錯誤整理成清楚訊息。",
        "prompt": "幫我寫一個功能，統一負責「呼叫分析、處理金鑰、把各種錯誤整理成看得懂的訊息」，\n並支援 PDF 這種只能用 Gemini 的情況自動切換。請加中文註解。",
        "code": "def _run_analyze(pc, target, force_gemini=False, **kw):\n    \"\"\"\n    依供應商設定執行 providers.analyze，統一處理金鑰解析與錯誤。\n    force_gemini=True 時（例如 PDF）強制走伺服器 Gemini 金鑰。\n    回傳 (result_dict, status_code)。\n    \"\"\"\n    provider = pc['provider']\n    note = None\n    if force_gemini and provider != 'gemini':\n        provider = 'gemini'\n        note = 'PDF 不支援所選供應商，已自動改用 Gemini 雲端辨識'\n\n    try:\n        if provider == 'openai':\n            if not pc['api_key']:\n                return {\"ok\": False, \"error\": \"OpenAI 相容供應商需要 API Key（請到設定填入）\"}, 400\n            result = providers.analyze('openai', pc['api_key'], pc['model'], target,\n                                       base_url=pc['base_url'], **kw)\n        else:  # gemini\n            key = (pc['api_key'] if pc['provider'] == 'gemini' else '') or API_KEY\n            if not key:\n                return {\"ok\": False, \"error\": \"找不到 Gemini API Key\"}, 400\n            model = pc['model'] if pc['provider'] == 'gemini' else ''\n            result = providers.analyze('gemini', key, model, target, **kw)\n    except requests.HTTPError as e:\n        body = ''\n        try:\n            body = e.response.text[:300]\n        except Exception:\n            pass\n        return {\"ok\": False, \"error\": f\"HTTP {e.response.status_code if e.response else '?'}: {body}\"}, 400\n    except Exception as e:\n        logger.error(f\"analyze error: {e}\")\n        return {\"ok\": False, \"error\": f\"{type(e).__name__}: {e}\"}, 400\n\n    out = {\"ok\": True, **result}\n    if note:\n        out[\"note\"] = note\n    return out, 200"
      },
      {
        "title": "做拍照翻譯 API",
        "note": "收前端的 base64 照片，解碼後送去分析。",
        "prompt": "幫我做一個 /api/vision 路由（POST）：收下前端拍的照片（base64），解碼後送去分析，回傳摘要和翻譯。請加中文註解。",
        "code": "@app.route('/api/vision', methods=['POST'])\ndef api_vision():\n    \"\"\"相機拍照 → 摘要 + 翻譯。前端傳 base64 影像（可含 dataURL 前綴）+ 供應商設定。\"\"\"\n    import base64 as _b64\n    data = request.get_json(force=True, silent=True) or {}\n    image_b64 = data.get('image') or ''\n    target = data.get('target') or 'Traditional Chinese (Taiwan)'\n    if not image_b64:\n        return jsonify({\"ok\": False, \"error\": \"no image\"}), 400\n\n    mime = 'image/jpeg'\n    if image_b64.startswith('data:'):\n        try:\n            header, image_b64 = image_b64.split(',', 1)\n            mime = header.split(':', 1)[1].split(';', 1)[0] or mime\n        except Exception:\n            pass\n    try:\n        raw = _b64.b64decode(image_b64)\n    except Exception:\n        return jsonify({\"ok\": False, \"error\": \"影像解碼失敗\"}), 400\n\n    pc = _provider_cfg(data)\n    result, status = _run_analyze(pc, target, file_bytes=raw, mime_type=mime)\n    return jsonify(result), status"
      }
    ]
  },
  "app_ch12": {
    "file": "app.py",
    "title": "上傳檔案翻譯",
    "intro": "讓使用者上傳圖片、PDF、純文字檔，後端讀懂後給摘要和翻譯。",
    "goals": [
      {
        "title": "設定檔案大小上限與支援格式",
        "note": "先定好可接受的檔案大小與圖片格式。",
        "prompt": "我要做「上傳檔案翻譯」。先幫我設定可接受的檔案大小上限，以及支援的圖片格式清單。請加中文註解。",
        "code": "# 上傳檔案翻譯：支援 圖片 / PDF / 純文字檔\nMAX_FILE_BYTES = 15 * 1024 * 1024   # 15MB\nIMAGE_EXTS = {'jpg', 'jpeg', 'png', 'webp', 'heic', 'heif', 'gif'}"
      },
      {
        "title": "做上傳檔案的 API",
        "note": "依副檔名/類型分流：文字、PDF（走 Gemini）、圖片，再送去分析。",
        "prompt": "幫我做一個 /api/file 路由（POST）：收下上傳的檔案，依照類型（純文字 / PDF / 圖片）分別處理，\nPDF 一律用 Gemini，再送去分析回傳結果。請加中文註解。",
        "code": "@app.route('/api/file', methods=['POST'])\ndef api_file():\n    \"\"\"上傳檔案 → 摘要 + 翻譯。支援 image/* 、application/pdf 、text/plain。PDF 一律走 Gemini。\"\"\"\n    f = request.files.get('file')\n    target = request.form.get('target') or 'Traditional Chinese (Taiwan)'\n    if not f:\n        return jsonify({\"ok\": False, \"error\": \"no file\"}), 400\n\n    filename = f.filename or 'upload'\n    raw = f.read()\n    if not raw:\n        return jsonify({\"ok\": False, \"error\": \"空白檔案\"}), 400\n    if len(raw) > MAX_FILE_BYTES:\n        return jsonify({\"ok\": False, \"error\": \"檔案過大（上限 15MB）\"}), 400\n\n    mime = (f.mimetype or '').lower()\n    ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''\n    pc = _provider_cfg(request.form)\n\n    if mime == 'text/plain' or ext in ('txt', 'md', 'csv'):\n        text = raw.decode('utf-8', errors='replace')\n        result, status = _run_analyze(pc, target, text=text)\n    elif mime == 'application/pdf' or ext == 'pdf':\n        # PDF 只有 Gemini 能原生讀取 → 強制回退 Gemini\n        result, status = _run_analyze(pc, target, force_gemini=True,\n                                      file_bytes=raw, mime_type='application/pdf')\n    elif mime.startswith('image/') or ext in IMAGE_EXTS:\n        if not mime.startswith('image/'):\n            mime = 'image/jpeg'\n        result, status = _run_analyze(pc, target, file_bytes=raw, mime_type=mime)\n    else:\n        return jsonify({\"ok\": False, \"error\": f\"不支援的檔案類型：{mime or ext or '未知'}\"}), 400\n\n    if isinstance(result, dict):\n        result.setdefault(\"filename\", filename)\n    return jsonify(result), status"
      }
    ]
  },
  "app_ch13": {
    "file": "app.py",
    "title": "匯率換算",
    "intro": "免金鑰的即時匯率查詢：主用一個服務，查不到就自動換備援。",
    "goals": [
      {
        "title": "做匯率換算 API",
        "note": "收幣別與金額，查即時匯率並換算；主服務失敗就用備援。",
        "prompt": "幫我做一個 /api/currency 路由（POST）：收下「來源幣別、目標幣別、金額」，查即時匯率並換算。\n請用免金鑰的服務，主要來源查不到時自動改用備援來源。請加中文註解。",
        "code": "# 匯率換算：免金鑰。主用 open.er-api.com（含 TWD 等多幣別），備援 frankfurter.app（歐洲央行）\n@app.route('/api/currency', methods=['POST'])\ndef api_currency():\n    data = request.get_json(force=True, silent=True) or {}\n    base = (data.get('base') or 'USD').upper()\n    target = (data.get('target') or 'TWD').upper()\n    try:\n        amount = float(data.get('amount', 1) or 1)\n    except (TypeError, ValueError):\n        amount = 1.0\n\n    if base == target:\n        return jsonify({\"ok\": True, \"base\": base, \"target\": target, \"amount\": amount,\n                        \"rate\": 1.0, \"result\": amount, \"date\": \"\", \"source\": \"same\"})\n\n    # 主：open.er-api.com（免金鑰，幣別多，含 TWD）\n    try:\n        r = requests.get(f\"https://open.er-api.com/v6/latest/{base}\", timeout=8)\n        r.raise_for_status()\n        d = r.json()\n        rate = (d.get(\"rates\") or {}).get(target)\n        if rate:\n            return jsonify({\"ok\": True, \"base\": base, \"target\": target, \"amount\": amount,\n                            \"rate\": rate, \"result\": amount * rate,\n                            \"date\": d.get(\"time_last_update_utc\", \"\"), \"source\": \"er-api\"})\n    except Exception as e:\n        logger.warning(f\"currency er-api failed: {e}\")\n\n    # 備援：frankfurter.app（歐洲央行，無 TWD 等部分亞幣）\n    try:\n        r = requests.get(\"https://api.frankfurter.app/latest\",\n                         params={\"from\": base, \"to\": target}, timeout=8)\n        r.raise_for_status()\n        d = r.json()\n        rate = (d.get(\"rates\") or {}).get(target)\n        if rate:\n            return jsonify({\"ok\": True, \"base\": base, \"target\": target, \"amount\": amount,\n                            \"rate\": rate, \"result\": amount * rate,\n                            \"date\": d.get(\"date\", \"\"), \"source\": \"frankfurter\"})\n    except Exception as e:\n        logger.warning(f\"currency frankfurter failed: {e}\")\n\n    return jsonify({\"ok\": False, \"error\": f\"查不到 {base}→{target} 匯率（請確認幣別代碼）\"}), 400"
      }
    ]
  },
  "app_ch14": {
    "file": "app.py",
    "title": "天氣查詢",
    "intro": "輸入地名或用目前位置，查即時天氣，還會給「要不要帶傘」的貼心建議。",
    "goals": [
      {
        "title": "準備天氣代碼表與常見地點",
        "note": "天氣代碼對照中文，並內建熱門旅遊地點座標避免查錯。",
        "prompt": "我要做天氣查詢。先幫我準備兩份對照表：\n1. 天氣代碼 → 中文描述（含 emoji）。\n2. 常見旅遊地點的中文名 → 經緯度，避免熱門地點被查錯。請加中文註解。",
        "code": "# 天氣：Open-Meteo（免金鑰）。地名→經緯度→即時天氣＋帶傘建議\nWMO_CODES = {\n    0: \"晴天 ☀️\", 1: \"大致晴朗 🌤️\", 2: \"部分多雲 ⛅\", 3: \"陰天 ☁️\",\n    45: \"有霧 🌫️\", 48: \"凍霧 🌫️\",\n    51: \"毛毛雨 🌦️\", 53: \"毛毛雨 🌦️\", 55: \"毛毛雨 🌦️\",\n    56: \"凍雨 🌧️\", 57: \"凍雨 🌧️\",\n    61: \"小雨 🌧️\", 63: \"中雨 🌧️\", 65: \"大雨 🌧️\",\n    66: \"凍雨 🌧️\", 67: \"凍雨 🌧️\",\n    71: \"小雪 🌨️\", 73: \"中雪 🌨️\", 75: \"大雪 🌨️\", 77: \"雪珠 🌨️\",\n    80: \"陣雨 🌦️\", 81: \"陣雨 🌧️\", 82: \"強陣雨 ⛈️\",\n    85: \"陣雪 🌨️\", 86: \"強陣雪 🌨️\",\n    95: \"雷陣雨 ⛈️\", 96: \"雷雨伴冰雹 ⛈️\", 99: \"強雷雨冰雹 ⛈️\",\n}\n\n\n# 常見旅遊地點（中文名 → 座標＋顯示名）：保證熱門地點精準，避免地理編碼誤配\nCOMMON_PLACES = {\n    \"台北\": (25.033, 121.565, \"台北，台灣\"), \"臺北\": (25.033, 121.565, \"台北，台灣\"),\n    \"台中\": (24.147, 120.673, \"台中，台灣\"), \"台南\": (22.999, 120.227, \"台南，台灣\"),\n    \"高雄\": (22.627, 120.301, \"高雄，台灣\"), \"花蓮\": (23.991, 121.601, \"花蓮，台灣\"),\n    \"台東\": (22.758, 121.144, \"台東，台灣\"), \"墾丁\": (21.947, 120.798, \"墾丁，台灣\"),\n    \"東京\": (35.690, 139.692, \"東京，日本\"), \"大阪\": (34.694, 135.502, \"大阪，日本\"),\n    \"京都\": (35.011, 135.768, \"京都，日本\"), \"名古屋\": (35.182, 136.906, \"名古屋，日本\"),\n    \"福岡\": (33.590, 130.402, \"福岡，日本\"), \"札幌\": (43.062, 141.354, \"札幌，日本\"),\n    \"北海道\": (43.062, 141.354, \"北海道，日本\"), \"沖繩\": (26.212, 127.681, \"沖繩，日本\"),\n    \"那霸\": (26.212, 127.681, \"那霸，日本\"), \"首爾\": (37.567, 126.978, \"首爾，韓國\"),\n    \"釜山\": (35.180, 129.075, \"釜山，韓國\"), \"曼谷\": (13.756, 100.502, \"曼谷，泰國\"),\n    \"清邁\": (18.788, 98.985, \"清邁，泰國\"), \"普吉島\": (7.880, 98.392, \"普吉島，泰國\"),\n    \"新加坡\": (1.352, 103.820, \"新加坡\"), \"香港\": (22.320, 114.170, \"香港\"),\n    \"澳門\": (22.199, 113.544, \"澳門\"), \"吉隆坡\": (3.139, 101.687, \"吉隆坡，馬來西亞\"),\n    \"峇里島\": (-8.409, 115.189, \"峇里島，印尼\"), \"峴港\": (16.055, 108.202, \"峴港，越南\"),\n    \"胡志明市\": (10.823, 106.630, \"胡志明市，越南\"), \"河內\": (21.028, 105.834, \"河內，越南\"),\n    \"上海\": (31.230, 121.474, \"上海，中國\"), \"北京\": (39.904, 116.407, \"北京，中國\"),\n}"
      },
      {
        "title": "把地名變成經緯度",
        "note": "先查內建清單，再查免金鑰的地理編碼服務。",
        "prompt": "幫我寫一個功能，把中文地名變成經緯度：先查我剛剛內建的清單，查不到再用免金鑰的線上服務。請加中文註解。",
        "code": "def _geocode(place):\n    \"\"\"中文地名 → (lat, lon, 顯示名)。內建常見地點 → Nominatim → Open-Meteo。查無回 None。\"\"\"\n    key = place.strip()\n    if key in COMMON_PLACES:\n        lat, lon, name = COMMON_PLACES[key]\n        return lat, lon, name\n    # Nominatim（OpenStreetMap，免金鑰，中文支援佳；須帶 User-Agent）\n    try:\n        r = requests.get(\"https://nominatim.openstreetmap.org/search\",\n                         params={\"q\": place, \"format\": \"json\", \"limit\": 1, \"accept-language\": \"zh-TW\"},\n                         headers={\"User-Agent\": \"liang-translator/1.0 (travel weather)\"}, timeout=10)\n        d = r.json()\n        if d:\n            item = d[0]\n            disp = item.get(\"display_name\", place).split(\",\")\n            name = disp[0].strip() + ((\"，\" + disp[-1].strip()) if len(disp) > 1 else \"\")\n            return float(item[\"lat\"]), float(item[\"lon\"]), name\n    except Exception as e:\n        logger.warning(f\"nominatim failed: {e}\")\n    # Open-Meteo 地理編碼（備援）\n    try:\n        g = requests.get(\"https://geocoding-api.open-meteo.com/v1/search\",\n                         params={\"name\": place, \"count\": 1, \"language\": \"zh\"}, timeout=8).json()\n        results = g.get(\"results\") or []\n        if results:\n            loc = results[0]\n            name = loc.get(\"name\", place) + ((\"，\" + loc[\"country\"]) if loc.get(\"country\") else \"\")\n            return loc[\"latitude\"], loc[\"longitude\"], name\n    except Exception as e:\n        logger.warning(f\"open-meteo geocode failed: {e}\")\n    return None"
      },
      {
        "title": "依天氣給貼心建議",
        "note": "會下雨就提醒帶傘，太熱太冷也提醒。",
        "prompt": "幫我寫一個功能，依照天氣狀況和溫度，給一句貼心建議（例如會下雨就提醒帶傘、太冷提醒保暖）。請加中文註解。",
        "code": "def _weather_advice(code, temp, pop):\n    tips = []\n    rainy = code in (51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99) or (pop is not None and pop >= 50)\n    if rainy:\n        tips.append(\"☂️ 建議帶傘\")\n    if temp is not None:\n        if temp >= 30:\n            tips.append(\"🧴 高溫，注意防曬補水\")\n        elif temp <= 12:\n            tips.append(\"🧥 偏冷，記得保暖\")\n    if not tips:\n        tips.append(\"👍 天氣舒適，玩得開心\")\n    return \"，\".join(tips)"
      },
      {
        "title": "做天氣查詢 API",
        "note": "地名或座標 → 查即時天氣 → 回傳溫度、天況與建議。",
        "prompt": "幫我做一個 /api/weather 路由（POST）：收下地名或經緯度，查即時天氣，\n回傳溫度、體感、濕度、天況描述，以及要不要帶傘的建議。請用免金鑰的服務。請加中文註解。",
        "code": "@app.route('/api/weather', methods=['POST'])\ndef api_weather():\n    data = request.get_json(force=True, silent=True) or {}\n    place = (data.get('place') or '').strip()\n    lat = data.get('lat')\n    lon = data.get('lon')\n    name = place or \"目前位置\"\n    try:\n        # 有地名先地理編碼；否則用前端傳來的經緯度（目前位置）\n        if place:\n            geo = _geocode(place)\n            if not geo:\n                return jsonify({\"ok\": False, \"error\": f\"找不到地點「{place}」\"}), 400\n            lat, lon, name = geo\n        if lat is None or lon is None:\n            return jsonify({\"ok\": False, \"error\": \"缺少地點或座標\"}), 400\n\n        # 選填：若有 OpenWeatherMap 金鑰就改用 OWM（否則走免金鑰 Open-Meteo）\n        owm_key = (data.get('owm_key') or '').strip()\n        if owm_key:\n            o = requests.get(\"https://api.openweathermap.org/data/2.5/weather\", params={\n                \"lat\": lat, \"lon\": lon, \"appid\": owm_key, \"units\": \"metric\", \"lang\": \"zh_tw\",\n            }, timeout=8).json()\n            if str(o.get(\"cod\")) == \"200\":\n                main = o.get(\"main\") or {}\n                wid = ((o.get(\"weather\") or [{}])[0]).get(\"id\", 800)\n                desc = ((o.get(\"weather\") or [{}])[0]).get(\"description\", \"—\")\n                raining = wid < 700\n                temp = main.get(\"temp\")\n                return jsonify({\n                    \"ok\": True, \"place\": name, \"temp\": temp,\n                    \"feels\": main.get(\"feels_like\"), \"humidity\": main.get(\"humidity\"),\n                    \"desc\": desc, \"pop\": None,\n                    \"hi\": main.get(\"temp_max\"), \"lo\": main.get(\"temp_min\"),\n                    \"advice\": _weather_advice(61 if raining else 0, temp, None),\n                    \"source\": \"owm\",\n                })\n            # OWM 失敗就繼續走 Open-Meteo\n\n        w = requests.get(\"https://api.open-meteo.com/v1/forecast\", params={\n            \"latitude\": lat, \"longitude\": lon,\n            \"current\": \"temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,precipitation\",\n            \"daily\": \"temperature_2m_max,temperature_2m_min,precipitation_probability_max\",\n            \"timezone\": \"auto\", \"forecast_days\": 1,\n        }, timeout=8).json()\n        cur = w.get(\"current\") or {}\n        daily = w.get(\"daily\") or {}\n        code = cur.get(\"weather_code\")\n        temp = cur.get(\"temperature_2m\")\n        pop = (daily.get(\"precipitation_probability_max\") or [None])[0]\n        hi = (daily.get(\"temperature_2m_max\") or [None])[0]\n        lo = (daily.get(\"temperature_2m_min\") or [None])[0]\n        return jsonify({\n            \"ok\": True, \"place\": name,\n            \"temp\": temp, \"feels\": cur.get(\"apparent_temperature\"),\n            \"humidity\": cur.get(\"relative_humidity_2m\"),\n            \"desc\": WMO_CODES.get(code, \"—\"),\n            \"pop\": pop, \"hi\": hi, \"lo\": lo,\n            \"advice\": _weather_advice(code, temp, pop),\n        })\n    except Exception as e:\n        logger.error(f\"weather error: {e}\")\n        return jsonify({\"ok\": False, \"error\": f\"天氣查詢失敗：{type(e).__name__}\"}), 400"
      }
    ]
  },
  "providers_ch15": {
    "file": "providers.py",
    "title": "通用問答功能",
    "intro": "旅遊助手要能「回答問題」，我們幫翻譯引擎再加一個通用單輪問答功能。",
    "goals": [
      {
        "title": "加一個通用問答功能",
        "note": "給一段系統指令和使用者問題，依供應商回一段答覆。",
        "prompt": "幫我在翻譯引擎裡再加一個「通用問答」功能 generate：\n給它一段系統指令和使用者的問題，依指定的供應商（Gemini 或 OpenAI）回一段答覆。請加中文註解。",
        "code": "def generate(provider: str, api_key: str, model: str, base_url: str, system: str, user: str) -> str:\n    \"\"\"通用單輪生成（system + user → text），依 provider 分派。供旅遊問答等使用。\"\"\"\n    provider = (provider or \"gemini\").lower()\n    if provider == \"openai\":\n        return translate_openai(base_url, api_key, model, system, user, timeout=45)\n    if model and not model.startswith(\"gemini\"):\n        model = \"\"\n    return translate_gemini(api_key, model, system, user)"
      }
    ]
  },
  "app_ch15": {
    "file": "app.py",
    "title": "旅遊助手問答",
    "intro": "做一個會回答旅遊問題的助手，能選用即時網搜，再交給 AI 回答。",
    "goals": [
      {
        "title": "接上網搜尋（選用）",
        "note": "有金鑰就上網查最新資料當作參考。",
        "prompt": "我要做旅遊問答助手。幫我寫一個「上網搜尋」的小功能（用 Tavily），\n有提供金鑰時才上網查、拿回搜尋結果當參考。請加中文註解。",
        "code": "# 旅遊問答／助手：可選 Tavily 上網 + 走設定供應商的 LLM 回答\ndef _tavily_search(key, query, max_results=5):\n    r = requests.post(\"https://api.tavily.com/search\", json={\n        \"api_key\": key, \"query\": query, \"max_results\": max_results,\n        \"include_answer\": True, \"search_depth\": \"basic\",\n    }, timeout=20)\n    r.raise_for_status()\n    return r.json()"
      },
      {
        "title": "做旅遊問答 API",
        "note": "先（選用）上網查，再把問題和參考資料交給 AI 回答。",
        "prompt": "幫我做一個 /api/ask 路由（POST）：收下使用者的問題，\n如果有搜尋金鑰就先上網查，再把問題和查到的資料交給 AI 回答，回傳答案和參考來源。請加中文註解。",
        "code": "@app.route('/api/ask', methods=['POST'])\ndef api_ask():\n    data = request.get_json(force=True, silent=True) or {}\n    question = (data.get('question') or '').strip()\n    if not question:\n        return jsonify({\"ok\": False, \"error\": \"請輸入問題\"}), 400\n    target = data.get('target') or 'Traditional Chinese (Taiwan)'\n    pc = _provider_cfg(data)\n    tavily_key = (data.get('tavily_key') or os.getenv('TAVILY_API_KEY') or '').strip()\n\n    # 1) 有 Tavily 金鑰才上網查；失敗或額度爆掉就略過，改用 AI 自身知識\n    context, sources, searched, search_note = \"\", [], False, \"\"\n    if tavily_key:\n        try:\n            d = _tavily_search(tavily_key, question)\n            results = d.get(\"results\") or []\n            if d.get(\"answer\"):\n                context += f\"Web summary: {d['answer']}\\n\"\n            for it in results:\n                context += f\"- {it.get('title','')}: {it.get('content','')}\\n\"\n                sources.append({\"title\": it.get(\"title\", \"\"), \"url\": it.get(\"url\", \"\")})\n            searched = bool(results or d.get(\"answer\"))\n        except Exception as e:\n            logger.warning(f\"tavily failed: {e}\")\n            search_note = \"（即時搜尋暫時無法使用，改用 AI 既有知識回答）\"\n\n    # 2) 交給 LLM 回答（走設定的供應商）\n    system = (\n        \"You are a helpful, concise travel assistant. \"\n        f\"Answer the user's question in {target}. \"\n        \"If web search context is provided, prefer those up-to-date facts and be specific; \"\n        \"otherwise answer from your own knowledge and flag uncertainty for time-sensitive details. \"\n        \"Use short paragraphs or bullet points when helpful.\"\n    )\n    user = question if not context else f\"Question: {question}\\n\\nWeb search context:\\n{context}\"\n    try:\n        if pc['provider'] == 'openai':\n            if not pc['api_key']:\n                return jsonify({\"ok\": False, \"error\": \"OpenAI 相容供應商需要 API Key（請到設定填入）\"}), 400\n            answer = providers.generate('openai', pc['api_key'], pc['model'], pc['base_url'], system, user)\n        else:\n            key = pc['api_key'] or API_KEY\n            if not key:\n                return jsonify({\"ok\": False, \"error\": \"找不到 Gemini API Key\"}), 400\n            answer = providers.generate('gemini', key, pc['model'], '', system, user)\n    except requests.HTTPError as e:\n        body = ''\n        try:\n            body = e.response.text[:300]\n        except Exception:\n            pass\n        return jsonify({\"ok\": False, \"error\": f\"HTTP {e.response.status_code if e.response else '?'}: {body}\"}), 400\n    except Exception as e:\n        logger.error(f\"ask error: {e}\")\n        return jsonify({\"ok\": False, \"error\": f\"{type(e).__name__}: {e}\"}), 400\n\n    return jsonify({\"ok\": True, \"answer\": (answer or \"\") + ((\"\\n\\n\" + search_note) if search_note else \"\"),\n                    \"sources\": sources, \"searched\": searched})"
      }
    ]
  },
  "app_ch16": {
    "file": "app.py",
    "title": "PWA 安裝設定",
    "intro": "讓 App 能「加到手機主畫面」、可離線：從根路徑提供 manifest 與 service worker。",
    "goals": [
      {
        "title": "提供 manifest.json",
        "note": "App 的安裝設定檔，要能從網站根目錄取得。",
        "prompt": "我要把網站變成可以「加到手機主畫面」的 PWA。\n幫我加一個路由，從根目錄提供 App 的安裝設定檔 manifest.json。請加中文註解。",
        "code": "# PWA：manifest 與 service worker 需從根路徑提供\n@app.route('/manifest.json')\ndef manifest():\n    return send_from_directory('static', 'manifest.json', mimetype='application/manifest+json')"
      },
      {
        "title": "提供 service worker",
        "note": "負責離線快取的背景程式，需要特別的權限標頭。",
        "prompt": "幫我再加一個路由，從根目錄提供 service worker（sw.js），\n並設定好讓它可以管控整個網站的權限標頭。請加中文註解。",
        "code": "@app.route('/sw.js')\ndef service_worker():\n    resp = send_from_directory('static', 'sw.js', mimetype='application/javascript')\n    resp.headers['Service-Worker-Allowed'] = '/'\n    return resp"
      }
    ]
  }
};
