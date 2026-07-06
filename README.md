# 亮言 · 即時翻譯 (Liang Real-Time Translator)

雙向即時翻譯 Web App／PWA。支援**單人模式**與**面對面模式**（手機平放桌上、上下對開翻轉，兩人各看各的語言），翻譯後端可自由切換 **Gemini** 或**任何 OpenAI 相容供應商**（OpenAI / Groq / DeepSeek / OpenRouter…）。

## ✨ 功能

- **兩種對話模式**
  - 👤 單人模式：一個人對著手機翻譯（含文字輸入）。
  - 👥 面對面模式：畫面上下對開、上半 180° 翻轉給對面的人看，兩側各有麥克風，各自講各自的語言。
- **兩種語音引擎**
  - 逐句：瀏覽器語音辨識 (STT) → 翻譯 → 朗讀 (TTS)，**支援所有供應商**、跨平台。
  - 即時：Gemini Live 串流，低延遲（僅 Gemini）。
- **可插拔翻譯後端**：設定頁填「網址 + API Key + 模型名」，即可接任何 OpenAI 相容服務；或直接用 Gemini。
- **18 種語言**（含台繁 / 港繁 / 簡中分流、日韓泰越印馬高棉…）。
- **文字輸入翻譯**、**歷史紀錄**、**語速調整**、**自動朗讀**。
- **PWA**：手機可「加到主畫面」，像原生 App 一樣開。

## 🗂 檔案結構

| 檔案 | 說明 |
|------|------|
| `app.py` | Flask 主程式：`/api/translate` 翻譯端點 + Gemini Live 即時 socket + PWA 路由 |
| `providers.py` | 翻譯供應商抽象層（Gemini / OpenAI 相容） |
| `templates/index.html` | 前端頁面（雙模式、設定、歷史 modal） |
| `static/js/app.js` | 前端邏輯（STT/TTS、翻譯呼叫、模式切換） |
| `static/css/style.css` | 深紫＋金色主題 |
| `static/manifest.json`, `static/sw.js` | PWA 設定與離線快取 |
| `translation_app.py` | 舊版 CLI（終端機純語音，保留） |

## 🚀 安裝與執行

```bash
pip install -r requirements.txt
python app.py
```

瀏覽器開 `http://localhost:5001`。手機與電腦同一 WiFi 時，用手機開 `http://<電腦IP>:5001` 即可（例：`http://192.168.1.x:5001`）。

> ⚠️ 麥克風需要 `localhost` 或 HTTPS 才能用。手機用區網 IP 連線時，瀏覽器語音辨識可能因非安全連線受限；正式對外請掛 HTTPS。

## 🔑 API 金鑰設定

在 `.env` 放 Gemini 金鑰（擇一）：

```env
GEMINI_API_KEY=AIzaSy...   # 建議
# 或
GOOGLE_API_KEY=AIzaSy...
```

程式讀取順序為 `GEMINI_API_KEY` → `GOOGLE_API_KEY`。若要用 OpenAI 相容供應商，直接在 App 的「⚙️ 設定」裡填網址／Key／模型即可，不必寫進 `.env`。

## 🧭 使用說明

1. **⚙️ 設定**：選供應商（Gemini 或 OpenAI 相容），OpenAI 相容需填網址與 Key。
2. **單人**：選來源／目標語言 → 按麥克風說話，或在下方輸入文字按「翻譯」。
3. **面對面**：點右上「👤 單人」切成「👥 面對面」，手機平放桌上，兩人各按自己那側的麥克風。
4. **🕐 歷史**：查看與清空翻譯紀錄。

## 🛠 技術

Flask + Flask-SocketIO + google-genai + requests。前端純原生 JS（Web Speech API STT/TTS）。無需資料庫，設定與歷史存於瀏覽器 localStorage。
