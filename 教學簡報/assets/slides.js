/* ============================================================
   亮言課程 · 共用簡報邏輯（所有 CHxx 共用）
   用法：頁面在 slides 之後放
     <script>window.SLIDE_CFG={title:'CH00 · ...',part:'#4A90D9',next:'CH01.html'}</script>
     <script src="assets/slides.js"></script>
   會自動注入：頂部列、上下頁鈕、底部圓點、頁碼、設定面板（字級 + 10 底色）。
   全域函式：go(i) / ch(d) / cp(btn) / downloadText(name,text)
   ============================================================ */
(function () {
  var cfg = window.SLIDE_CFG || {};
  document.documentElement.style.setProperty('--p', cfg.part || '#4A90D9');

  var THEMES = [
    { c: '#f8f9fa', n: '淨白' }, { c: '#f7f1e3', n: '米色' }, { c: '#eef3f9', n: '淺藍' },
    { c: '#eef7ef', n: '淺綠' }, { c: '#fbeef2', n: '淺粉' }, { c: '#f2eefb', n: '淺紫' },
    { c: '#fdf6e3', n: '奶油' }, { c: '#e6efe6', n: '豆綠' }, { c: '#eceef2', n: '淺灰' }, { c: '#1e1e2a', n: '夜間' }
  ];

  // 頂部列
  var tb = document.createElement('div');
  tb.className = 'top-bar';
  tb.innerHTML =
    '<div class="tb-group"><a class="tb-btn" href="index.html">🏠 首頁</a><span class="tb-title">' + (cfg.title || '') + '</span></div>' +
    '<div class="tb-group">' +
    '<a class="tb-btn" href="https://www.youtube.com/@Liang-yt02" target="_blank">▶ YouTube</a>' +
    '<a class="tb-btn" href="https://www.facebook.com/groups/2754139931432955" target="_blank">f 社團</a>' +
    '<a class="tb-btn" href="mailto:3a01chatgpt@gmail.com">✉</a>' +
    '<button class="tb-btn" id="_gear">⚙ 設定</button>' +
    '<button class="tb-btn" id="_fs">⛶</button></div>';
  document.body.insertBefore(tb, document.body.firstChild);

  // 設定面板
  var panel = document.createElement('div');
  panel.className = 'panel'; panel.id = '_panel';
  panel.innerHTML =
    '<h4>字體大小</h4><div class="row" id="_fsRow">' +
    ['sm', 'md', 'lg', 'xl'].map(function (v, i) { return '<button class="fsbtn" data-fs="' + v + '">' + ['小', '中', '大', '特大'][i] + '</button>'; }).join('') +
    '</div><h4>底色風格（10 種）</h4><div class="row" id="_bgRow">' +
    THEMES.map(function (t, i) { return '<div class="sw" title="' + t.n + '" data-bg="' + (i + 1) + '" style="background:' + t.c + '"></div>'; }).join('') +
    '</div>';
  document.body.appendChild(panel);

  // 上下頁
  var prev = mk('button', 'nav-btn prev-btn', '◀'); prev.onclick = function () { ch(-1); };
  var next = mk('button', 'nav-btn next-btn', '▶'); next.onclick = function () { ch(1); };
  document.body.appendChild(prev); document.body.appendChild(next);
  var dotsEl = mk('div', 'dots', ''); document.body.appendChild(dotsEl);
  var pageno = mk('div', 'pageno', ''); document.body.appendChild(pageno);
  function mk(t, c, x) { var e = document.createElement(t); e.className = c; e.textContent = x; return e; }

  var slides = document.querySelectorAll('.slide'), cur = 0;
  slides.forEach(function (_, i) { var d = document.createElement('div'); d.className = 'dot'; d.onclick = function () { go(i); }; dotsEl.appendChild(d); });
  function upd() {
    dotsEl.querySelectorAll('.dot').forEach(function (d, i) { d.classList.toggle('active', i === cur); });
    pageno.textContent = (cur + 1) + ' / ' + slides.length;
    prev.disabled = (cur === 0); next.disabled = (cur === slides.length - 1);
  }
  window.go = function (i) { if (i < 0 || i >= slides.length) return; slides[cur].classList.remove('active'); cur = i; slides[cur].classList.add('active'); slides[cur].scrollTop = 0; upd(); };
  window.ch = function (d) { go(cur + d); };
  slides.forEach(function (s) { s.classList.remove('active'); });
  if (slides.length) slides[0].classList.add('active');
  upd();

  document.addEventListener('keydown', function (e) {
    var tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;  // 生成器輸入時不翻頁
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') ch(1);
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') ch(-1);
    if (e.key === 'f' || e.key === 'F') doFs();
  });
  function doFs() { if (!document.fullscreenElement) { document.documentElement.requestFullscreen && document.documentElement.requestFullscreen(); } else { document.exitFullscreen && document.exitFullscreen(); } }
  document.getElementById('_fs').onclick = doFs;
  document.getElementById('_gear').onclick = function () { panel.classList.toggle('show'); };

  function applyFs(v) {
    ['fs-sm', 'fs-lg', 'fs-xl'].forEach(function (c) { document.body.classList.remove(c); });
    if (v !== 'md') document.body.classList.add('fs-' + v);
    localStorage.setItem('liang-slide-fs', v);
    panel.querySelectorAll('#_fsRow .fsbtn').forEach(function (b) { b.classList.toggle('on', b.dataset.fs === v); });
  }
  function applyBg(v) {
    for (var i = 1; i <= 10; i++) document.body.classList.remove('bg-' + i);
    document.body.classList.add('bg-' + v);
    localStorage.setItem('liang-slide-bg', v);
    panel.querySelectorAll('#_bgRow .sw').forEach(function (s) { s.classList.toggle('on', s.dataset.bg === String(v)); });
  }
  panel.querySelectorAll('#_fsRow .fsbtn').forEach(function (b) { b.onclick = function () { applyFs(b.dataset.fs); }; });
  panel.querySelectorAll('#_bgRow .sw').forEach(function (s) { s.onclick = function () { applyBg(s.dataset.bg); }; });
  applyFs(localStorage.getItem('liang-slide-fs') || 'md');
  applyBg(localStorage.getItem('liang-slide-bg') || '1');

  // 一鍵複製（.term / .prompt / .gen 內的 pre 或 .out）
  window.cp = function (btn) {
    var box = btn.closest('.term,.prompt,.gen'); if (!box) return;
    var el = box.querySelector('.out') || box.querySelector('pre'); if (!el) return;
    var ok = function () { var t = btn.textContent; btn.textContent = '✓ 已複製'; setTimeout(function () { btn.textContent = t; }, 1500); };
    var fallback = function () {
      try { var r = document.createRange(); r.selectNodeContents(el); var s = getSelection(); s.removeAllRanges(); s.addRange(r); document.execCommand('copy'); s.removeAllRanges(); ok(); }
      catch (e) { btn.textContent = '請手動選取複製'; setTimeout(function () { btn.textContent = '複製'; }, 1800); }
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(el.innerText).then(ok).catch(fallback);   // file:// 或非 HTTPS 會走 fallback
    } else { fallback(); }
  };
  // 一鍵下載
  window.downloadText = function (filename, text) {
    var blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  };
})();
