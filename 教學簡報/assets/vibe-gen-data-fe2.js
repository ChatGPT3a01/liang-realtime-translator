/* ============================================================
   Vibe 逐段生成器 · 前端資料檔（第三波：index/style/appjs 補齊，請勿手改）
   由 gen 補洞流程產生：碼取自清理前的成品簡報，密碼已消毒為示範 1234。
   ============================================================ */
window.VIBE_GENERATORS = Object.assign(window.VIBE_GENERATORS || {}, {
  "index_ch07": {
    "file": "templates/index.html",
    "title": "CH07 · 畫面片段（index.html）",
    "intro": "這一章在 templates/index.html 要加的部分，用生成器一段段疊出來。",
    "goals": [
      {
        "title": "步驟二：解法 = 借 OpenCC 把簡體轉繁體",
        "note": "在 templates/index.html 加上：步驟二：解法 = 借 OpenCC 把簡體轉繁體。",
        "prompt": "用瀏覽器內建的 Web Speech API，幫我寫一個 Recognizer class： - 點一下開始聽，即時把逐字稿顯示出來（用一個 onInterim 回呼）。 - 再點一下停止，把「整段」文字交出去（用一個 onDone 回呼）翻譯。 - 講話會斷句，聽到一半自動續聽（onend 裡重新 start）。 - 要處理麥克風權限被拒、瀏覽器不支援的情況（跳提示，不要當掉）。 我是完全不會寫程式的新手，請附完整程式碼。",
        "code": "<!-- OpenCC：手機語音辨識常把國語轉成簡體，載入後把辨識結果轉回繁體 -->\n<script src=\"https://cdn.jsdelivr.net/npm/opencc-js@1.0.5/dist/umd/full.js\"></script>"
      }
    ]
  },
  "index_ch10": {
    "file": "templates/index.html",
    "title": "CH10 · 畫面片段（index.html）",
    "intro": "這一章在 templates/index.html 要加的部分，用生成器一段段疊出來。",
    "goals": [
      {
        "title": "步驟一：做出「上下兩塊」的畫面",
        "note": "在 templates/index.html 加上：步驟一：做出「上下兩塊」的畫面。",
        "prompt": "幫我在 index.html 加一個「面對面模式」區塊 <section id=\"faceView\">， 先隱藏。裡面分上、下兩塊 face-panel：上塊 id 用 top、下塊用 bottom。 每一塊都要有：語言選單、翻譯結果框、一顆麥克風「說話」按鈕。 上塊元素 id 用 f_langTop / f_resultTop / f_micTop， 下塊用 f_langBottom / f_resultBottom / f_micBottom。 中間放一條分隔線寫「面對面 · 手機平放桌上」。",
        "code": "<!-- ===== 面對面模式 ===== -->\n<section id=\"faceView\" class=\"view hidden\">\n  <!-- 上半：翻轉 180°，給對面的人看 -->\n  <div class=\"face-panel top\" id=\"face_top\">\n    <div class=\"face-inner\">\n      <select class=\"lang-select\" id=\"f_langTop\"></select>\n      <div class=\"result-box face-result\" id=\"f_resultTop\">\n        <span class=\"placeholder\">對方語言的翻譯會顯示在這裡…</span>\n      </div>\n      <button class=\"mic-btn face-mic\" id=\"f_micTop\"><span class=\"mic-ico\">🎤</span> 說話</button>\n    </div>\n  </div>\n\n  <div class=\"face-divider\"><span>面對面 · 手機平放桌上</span></div>\n\n  <!-- 下半：正常方向，給你看 -->\n  <div class=\"face-panel bottom\" id=\"face_bottom\">\n    <div class=\"face-inner\">\n      <select class=\"lang-select\" id=\"f_langBottom\"></select>\n      <div class=\"result-box face-result\" id=\"f_resultBottom\">\n        <span class=\"placeholder\">你的語言的翻譯會顯示在這裡…</span>\n      </div>\n      <button class=\"mic-btn face-mic\" id=\"f_micBottom\"><span class=\"mic-ico\">🎤</span> 說話</button>\n    </div>\n  </div>\n</section>"
      },
      {
        "title": "步驟四：加一顆「切換模式」按鈕",
        "note": "在 templates/index.html 加上：步驟四：加一顆「切換模式」按鈕。",
        "prompt": "幫我寫 makeFaceSide(langSelId, resultBoxId, micBtnId, getTargetId)： 用現成的 Recognizer 監聽這一塊的麥克風按鈕； 講完停止後，把整段用 translate() 翻成對面的語言， 顯示在「對面那一塊」的結果框，再用 speak() 朗讀出來。 然後呼叫兩次：下塊 f_micBottom 翻到上塊、上塊 f_micTop 翻到下塊。",
        "code": "<!-- index.html 頂部工具列 -->\n<button class=\"icon-btn\" id=\"modeBtn\" title=\"切換模式\">👤 單人</button>"
      }
    ]
  },
  "style_ch10": {
    "file": "static/css/style.css",
    "title": "CH10 · 樣式（style.css）",
    "intro": "這一章在 static/css/style.css 要加的部分，用生成器一段段疊出來。",
    "goals": [
      {
        "title": "步驟二：把上半「翻過來」",
        "note": "在 static/css/style.css 加上：步驟二：把上半「翻過來」。",
        "prompt": "幫我寫面對面模式的 CSS： faceView 用 flex 直向排列、上下兩塊平分高度。 每一塊 face-panel 裡面內容直向排列（選單、結果框、麥克風）。 最重要：把上半 .face-panel.top 用 transform: rotate(180deg) 翻過來， 讓坐我對面的人看是正的。",
        "code": "/* ---------- 面對面模式 ---------- */\n#faceView { padding: 0; }\n.face-panel { flex: 1; display: flex; padding: 16px; overflow: hidden; }\n.face-panel.top {\n  transform: rotate(180deg);              /* ← 就是這一行：上半掉頭給對面看 */\n  background: rgba(245,196,81,0.04);\n}\n.face-inner { flex: 1; display: flex; flex-direction: column; gap: 12px; }\n.face-result { font-size: 1.4rem; }\n.face-mic { padding: 13px; font-size: .95rem; }\n.face-divider {\n  display: flex; align-items: center; justify-content: center;\n  padding: 6px 0; background: rgba(0,0,0,.2);\n}"
      }
    ]
  },
  "index_ch11": {
    "file": "templates/index.html",
    "title": "CH11 · 畫面片段（index.html）",
    "intro": "這一章在 templates/index.html 要加的部分，用生成器一段段疊出來。",
    "goals": [
      {
        "title": "步驟三：加一顆「拍照」按鈕",
        "note": "在 templates/index.html 加上：步驟三：加一顆「拍照」按鈕。",
        "prompt": "請在 app.py 新增一個 /api/vision 端點（POST）： 從 JSON 收 image（dataURL 格式的照片）和 target（目標語言）。 把 dataURL 前綴去掉、base64 解碼成圖片 bytes， 呼叫 providers.analyze(金鑰, target, file_bytes=圖, mime_type=圖的類型)， 最後把 {summary, translation} 回傳成 JSON。",
        "code": "<!-- 手機會直接開後鏡頭 -->\n<input type=\"file\" id=\"cam\" accept=\"image/*\" capture=\"environment\" hidden>\n<button onclick=\"cam.click()\">📷 拍照翻譯</button>"
      }
    ]
  },
  "index_ch12": {
    "file": "templates/index.html",
    "title": "CH12 · 畫面片段（index.html）",
    "intro": "這一章在 templates/index.html 要加的部分，用生成器一段段疊出來。",
    "goals": [
      {
        "title": "步驟二：加一顆「上傳檔案」按鈕",
        "note": "在 templates/index.html 加上：步驟二：加一顆「上傳檔案」按鈕。",
        "prompt": "請在 app.py 新增一個 /api/file 端點（POST），用 multipart（FormData）接收上傳檔案： 用 request.files.get('file') 拿檔案、request.form.get('target') 拿目標語言。 限制 15MB，超過就回錯誤。 依 MIME 與副檔名分流： - text/plain 或 .txt/.md/.csv → 讀成文字，用 text= 呼叫 analyze() - application/pdf 或 .pdf → 用 file_bytes= 呼叫，mime 設 application/pdf，並強制走 Gemini - image/* → 用 file_bytes= 呼叫，帶上圖片的 mime 最後回 {ok, summary, translation}，並附上 filename。",
        "code": "<!-- 一顆漂亮按鈕 + 一個藏起來的檔案選擇框 -->\n<button id=\"s_file\" class=\"tool-btn\">📎 上傳檔案</button>\n\n<input type=\"file\" id=\"fileInput\" hidden\n       accept=\"image/*,application/pdf,text/plain,.pdf,.txt,.md,.csv\">"
      }
    ]
  },
  "index_ch13": {
    "file": "templates/index.html",
    "title": "CH13 · 畫面片段（index.html）",
    "intro": "這一章在 templates/index.html 要加的部分，用生成器一段段疊出來。",
    "goals": [
      {
        "title": "步驟二：加一顆「💱 匯率」按鈕 + 小視窗",
        "note": "在 templates/index.html 加上：步驟二：加一顆「💱 匯率」按鈕 + 小視窗。",
        "prompt": "在 index.html 工具列加一顆 id=\"s_currency\" 的「💱 匯率」按鈕。 再做一個 id=\"currencyModal\" 的隱藏小視窗，裡面放： 金額輸入框 id=\"cur_amount\"、來源幣別下拉 id=\"cur_from\"、 對調鈕 id=\"cur_swap\"、目標幣別下拉 id=\"cur_to\"、 結果區 id=\"cur_result\"、匯率與時間 id=\"cur_rate\"、 換算鈕 id=\"cur_convert\"、關閉鈕 id=\"cur_close\"。",
        "code": "<!-- ① 工具列裡加這顆按鈕 -->\n<button id=\"s_currency\" class=\"tool-btn\">💱 匯率</button>\n\n<!-- ② 換算小視窗（平常 hidden，按鈕按了才顯示）-->\n<div class=\"modal hidden\" id=\"currencyModal\">\n  <div class=\"modal-box\">\n    <input type=\"number\" id=\"cur_amount\" value=\"1\" min=\"0\" step=\"any\">\n    <div class=\"cur-row\">\n      <select id=\"cur_from\"></select>\n      <button id=\"cur_swap\" title=\"對調幣別\">⇄</button>\n      <select id=\"cur_to\"></select>\n    </div>\n    <div class=\"cur-result\" id=\"cur_result\">—</div>\n    <div class=\"cur-rate hint\" id=\"cur_rate\"></div>\n    <button id=\"cur_convert\">換算</button>\n    <button id=\"cur_close\">關閉</button>\n  </div>\n</div>"
      }
    ]
  },
  "index_ch14": {
    "file": "templates/index.html",
    "title": "CH14 · 畫面片段（index.html）",
    "intro": "這一章在 templates/index.html 要加的部分，用生成器一段段疊出來。",
    "goals": [
      {
        "title": "步驟四：加「🌤️ 天氣」按鈕與視窗",
        "note": "在 templates/index.html 加上：步驟四：加「🌤️ 天氣」按鈕與視窗。",
        "prompt": "請在 app.py 新增 /api/weather 端點（POST）： 從 JSON 收 place（地名）或 lat/lon（目前位置）。 有地名就先 _geocode() 轉座標，查無就回「找不到地點」。 拿座標打 Open-Meteo forecast，取目前溫度、體感、濕度、weather_code、 今日降雨機率與高低溫。用 WMO_CODES 翻成中文，用 _weather_advice() 算建議， 最後回 JSON：place、temp、feels、humidity、desc、pop、hi、lo、advice。",
        "code": "<!-- 功能區加一顆按鈕 -->\n<button id=\"s_weather\" class=\"tool-btn\">🌤️ 天氣</button>\n\n<!-- 天氣視窗 -->\n<div class=\"modal hidden\" id=\"weatherModal\">\n  <input type=\"text\" id=\"wx_place\" placeholder=\"例如：那霸、東京、台北…\">\n  <button class=\"primary\" id=\"wx_go\">查詢</button>\n  <button class=\"ghost\" id=\"wx_geo\">📍 用目前位置</button>\n  <div id=\"wx_result\" class=\"wx-result hidden\"></div>\n  <div id=\"wx_status\" class=\"hint\"></div>\n</div>"
      }
    ]
  },
  "index_ch15": {
    "file": "templates/index.html",
    "title": "CH15 · 畫面片段（index.html）",
    "intro": "這一章在 templates/index.html 要加的部分，用生成器一段段疊出來。",
    "goals": [
      {
        "title": "步驟三：加一個「問答框」",
        "note": "在 templates/index.html 加上：步驟三：加一個「問答框」。",
        "prompt": "請在 app.py 新增 /api/ask 端點（POST）： 從 JSON 收 question、target（回答語言）、tavily_key（選填）。 若有 tavily_key（或環境變數 TAVILY_API_KEY）就先呼叫 _tavily_search， 把 answer 和每筆 results 整理成「參考資料」文字，同時收集來源清單； searched 只有「真的有搜到東西」才算 True。 接著組 system 指令（用 target 語言、有參考資料就優先採用）， 用 providers.generate() 交給 AI 回答（沿用我設定的供應商）。 最後回傳 {ok, answer, sources, searched}。搜尋失敗要能自動退回純 AI。",
        "code": "<!-- 旅遊問答框 -->\n<textarea id=\"ask_q\" placeholder=\"想問什麼旅遊問題？例如：淺草附近有什麼好吃的\"></textarea>\n<button id=\"ask_go\">送出</button>\n<div id=\"ask_status\"></div>              <!-- 顯示「思考中…」或「🌐 已參考即時搜尋」 -->\n<div id=\"ask_answer\" class=\"hidden\"></div> <!-- 答案顯示在這 -->\n<div id=\"ask_sources\"></div>             <!-- 來源連結顯示在這 -->"
      }
    ]
  },
  "index_ch16": {
    "file": "templates/index.html",
    "title": "CH16 · 畫面片段（index.html）",
    "intro": "這一章在 templates/index.html 要加的部分，用生成器一段段疊出來。",
    "goals": [
      {
        "title": "步驟三：在網頁掛上 manifest",
        "note": "在 templates/index.html 加上：步驟三：在網頁掛上 manifest。",
        "prompt": "幫我寫一個 PWA 的 static/sw.js，採「網路優先」策略： - 快取名稱用 'liang-translate-v11'（之後改版就把數字 +1）。 - install 時 skipWaiting 讓新版立即接手。 - activate 時清掉所有舊快取，再 clients.claim()。 - fetch 時：/api/ 和 /socket.io/ 開頭一律略過（不快取）；只處理 GET。 其餘先 fetch 拿最新、順便存進快取；失敗就用快取， 連快取都沒有就回首頁 '/'。",
        "code": "<!-- templates/index.html 的 <head> 內 -->\n<meta name=\"theme-color\" content=\"#2a1a4a\">\n<link rel=\"manifest\" href=\"/manifest.json\">"
      }
    ]
  },
  "appjs_ch17": {
    "file": "static/js/app.js",
    "title": "CH17 · 前端邏輯（app.js）",
    "intro": "這一章在 static/js/app.js 要加的部分，用生成器一段段疊出來。",
    "goals": [
      {
        "title": "步驟一：做「會記住設定」的抽屜",
        "note": "在 static/js/app.js 加上：步驟一：做「會記住設定」的抽屜。",
        "prompt": "幫我在 app.js 最上面做一個設定系統： 定義 DEFAULT_CFG 物件，包含供應商 provider、各種金鑰（geminikey/tavilykey/owmkey）、 語速 rate、自動朗讀 autospeak、背景主題 theme（預設 'purple'）。 再寫 loadCfg() 從 localStorage 的 'liang_cfg' 讀出並補上預設值、 saveCfg(c) 存回去。最後 let cfg = loadCfg() 載入目前設定。 我是新手，請附完整程式碼與逐段說明。",
        "code": "// static/js/app.js — 設定系統\nconst DEFAULT_CFG = {\n  provider:'gemini', baseurl:'https://api.openai.com/v1', apikey:'', model:'',\n  geminikey:'', tavilykey:'', owmkey:'',   // 集中管理的金鑰（皆選填）\n  rate:1, autospeak:true,\n  theme:'purple',                          // 背景風格主題\n  s_langA:'zh-TW', s_langB:'en',\n};\nfunction loadCfg(){\n  try{ return {...DEFAULT_CFG, ...JSON.parse(localStorage.getItem('liang_cfg')||'{}')}; }\n  catch{ return {...DEFAULT_CFG}; }\n}\nfunction saveCfg(c){ localStorage.setItem('liang_cfg', JSON.stringify(c)); }\nlet cfg = loadCfg();   // 開機就把上次存的設定載進來"
      },
      {
        "title": "步驟三：打開設定 / 按儲存的邏輯",
        "note": "在 static/js/app.js 加上：步驟三：打開設定 / 按儲存的邏輯。",
        "prompt": "幫我寫 openSettings()：把 cfg 裡的值填進設定彈窗每一格（含 cfg_theme）， 再拿掉 settingsModal 的 hidden 顯示它。 另外綁定「儲存」按鈕 cfg_save：把每一格的值收回 cfg、呼叫 saveCfg(cfg) 存起來、 關掉彈窗、跳一個「已儲存設定」的提示。「取消」則直接關掉彈窗。",
        "code": "// 打開設定：把目前 cfg 的值填進每一格\nfunction openSettings(){\n  $('cfg_theme').value    = cfg.theme || 'purple';\n  $('cfg_geminikey').value= cfg.geminikey || '';\n  $('cfg_tavilykey').value= cfg.tavilykey || '';\n  $('cfg_owmkey').value   = cfg.owmkey || '';\n  $('cfg_rate').value     = cfg.rate;\n  $('cfg_autospeak').checked = cfg.autospeak;\n  $('settingsModal').classList.remove('hidden');   // 顯示彈窗\n}\n$('settingsBtn').addEventListener('click', openSettings);   // 點 ⚙️ 打開\n\n// 按「儲存」：把每一格收回 cfg 並存起來\n$('cfg_save').addEventListener('click', ()=>{\n  cfg.geminikey = $('cfg_geminikey').value.trim();\n  cfg.tavilykey = $('cfg_tavilykey').value.trim();\n  cfg.owmkey    = $('cfg_owmkey').value.trim();\n  cfg.rate      = $('cfg_rate').value;\n  cfg.autospeak = $('cfg_autospeak').checked;\n  cfg.theme     = $('cfg_theme').value;   // 記住選的主題\n  applyTheme(cfg.theme);                  // 立刻套用（步驟五定義）\n  saveCfg(cfg);                           // 寫進抽屜\n  $('settingsModal').classList.add('hidden');\n  toast('已儲存設定', false);\n});"
      },
      {
        "title": "步驟五：讓下拉選單真的換色",
        "note": "在 static/js/app.js 加上：步驟五：讓下拉選單真的換色。",
        "prompt": "幫我寫 applyTheme(t)：把主題名寫到 document.body.dataset.theme（空的就用 'purple'）。 讓 cfg_theme 下拉「一選就立刻套用」做即時預覽（先不存）。 「取消」時還原成已儲存的 cfg.theme（撤銷預覽）。 程式最後 applyTheme(cfg.theme) 一次，開機就套用上次選的背景。",
        "code": "// 套用背景風格：把主題名寫到 <body data-theme>，CSS 依此覆蓋配色變數\nfunction applyTheme(t){ document.body.dataset.theme = t || 'purple'; }\n\n// 選了主題立刻預覽（尚未儲存）\n$('cfg_theme').addEventListener('change', ()=> applyTheme($('cfg_theme').value));\n\n// 取消：還原成已儲存的主題（撤銷剛才的即時預覽）\n$('cfg_cancel').addEventListener('click', ()=>{\n  applyTheme(cfg.theme);\n  $('settingsModal').classList.add('hidden');\n});\n\n// …（省略：cfg_save 裡也會 applyTheme(cfg.theme)，見步驟三）\n\napplyTheme(cfg.theme);   // 開機就套用上次選的背景風格"
      }
    ]
  },
  "style_ch17": {
    "file": "static/css/style.css",
    "title": "CH17 · 樣式（style.css）",
    "intro": "這一章在 static/css/style.css 要加的部分，用生成器一段段疊出來。",
    "goals": [
      {
        "title": "步驟四：準備各種背景配色",
        "note": "在 static/css/style.css 加上：步驟四：準備各種背景配色。",
        "prompt": "幫我在 style.css 最上面用 CSS 變數做主題系統： :root 定義預設紫金色票 --bg1/--bg2/--bg3（背景漸層三色）與 --gold（重點金）。 再為每個主題寫一組 body[data-theme=\"ocean\"]、body[data-theme=\"forest\"]… 覆蓋這些變數。給我 ocean（海洋藍）、forest（森林綠）、sunset（夕陽橙）三款示範。",
        "code": "/* 預設色票：紫金 */\n:root {\n  --bg1:#1a1030; --bg2:#2a1a4a; --bg3:#3a2560;   /* 背景漸層三色 */\n  --gold:#f5c451; --gold-soft:#f7d98a;           /* 重點金 */\n}\n/* 換色：body 掛上 data-theme 就覆蓋上面的變數 */\nbody[data-theme=\"ocean\"] {   /* 海洋藍 */\n  --bg1:#0a1e33; --bg2:#12304f; --bg3:#1a4a70;\n  --gold:#4fc3f7; --gold-soft:#9fdcff;\n}\nbody[data-theme=\"forest\"] {  /* 森林綠 */\n  --bg1:#0d1f16; --bg2:#163524; --bg3:#1f4a30;\n  --gold:#5bd18a; --gold-soft:#9fe6b8;\n}\nbody[data-theme=\"sunset\"] {  /* 夕陽橙 */\n  --bg1:#2a1410; --bg2:#4a2418; --bg3:#6a2f1a;\n  --gold:#ff9d5c; --gold-soft:#ffc79f;\n}"
      }
    ]
  }
});
