/* ============================================================
   Vibe 逐段生成器 · 引擎（所有章節共用，寫一次）
   ------------------------------------------------------------
   用法（在投影片裡放一個掛載點即可）：
     <div class="vsim" data-gen="providers_ch06"></div>
   其中 data-gen 對應 vibe-gen-data.js 裡 window.VIBE_GENERATORS 的 key。

   核心概念（配合老師的教學設計）：
     一個檔案 → 拆成多個「目標」→ 每個目標有一段建議提示詞。
     學員複製／修改提示詞 → 貼到框裡 → 按「送出」→
     「假裝」在跑 AI（思考動畫 + 逐字打出），但其實直接吐出標準解答，
     確保每位學員疊出來的程式完全一致、且保證能跑。
     一塊一塊「併入」，最後湊出完整檔案，可下載。

   注意：這裡「不真的呼叫任何 AI」，是刻意的教學設計，
        目的是讓課堂上每個人的成果收斂到同一份正確程式。
   ============================================================ */
(function () {
  'use strict';

  // ---------- 1. 只注入一次的樣式（沿用簡報深紫＋金色主題） ----------
  function injectStyleOnce() {
    if (document.getElementById('vsim-style')) return;
    const css = `
    .vsim{width:100%;max-width:var(--cw,1180px);margin:10px 0;background:#fff;
      border:2px solid var(--p,#4A90D9);border-radius:16px;padding:18px 20px;
      box-shadow:0 6px 18px rgba(0,0,0,.08);font-family:inherit}
    .vsim .vs-head{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:6px}
    .vsim .vs-file{font-size:19px;font-weight:900;color:var(--p,#4A90D9);display:flex;align-items:center;gap:8px}
    .vsim .vs-prog{font-size:14px;font-weight:800;color:#fff;background:var(--p,#4A90D9);
      border-radius:20px;padding:4px 12px;white-space:nowrap}
    .vsim .vs-intro{font-size:16px;color:#5a5a72;line-height:1.6;margin:2px 0 12px}
    /* 固定顯示的「怎麼操作」三步驟 */
    .vsim .vs-how{font-size:14.5px;color:#234;background:#eef3fb;border:1px solid var(--p,#4A90D9);
      border-radius:10px;padding:10px 14px;margin:0 0 14px;line-height:1.7}
    .vsim .vs-how b{color:var(--p,#4A90D9)}
    .vsim .vs-how .n{display:inline-block;min-width:20px;height:20px;line-height:20px;text-align:center;
      background:var(--p,#4A90D9);color:#fff;border-radius:50%;font-size:12px;font-weight:900;margin-right:4px}
    /* 目標進度圓點 */
    .vsim .vs-dots{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:14px}
    .vsim .vs-dots .d{width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;
      font-size:13px;font-weight:900;background:#e7e7f0;color:#9a9ab0;border:2px solid transparent}
    .vsim .vs-dots .d.cur{background:#fff;color:var(--p,#4A90D9);border-color:var(--p,#4A90D9)}
    .vsim .vs-dots .d.done{background:#27AE60;color:#fff}
    /* 目標卡 */
    .vsim .vs-goal-title{font-size:20px;font-weight:900;color:#1a1a2e;margin-bottom:4px}
    .vsim .vs-goal-title .num{color:var(--gold,#F5A623)}
    .vsim .vs-goal-note{font-size:15px;color:#5a5a72;margin-bottom:12px}
    /* 提示詞框 */
    .vsim .vs-lbl{font-size:14px;font-weight:800;color:#444;display:flex;align-items:center;gap:8px;margin-bottom:6px}
    .vsim .vs-lbl .sp{flex:1}
    .vsim .vs-mini{background:var(--p,#4A90D9);color:#fff;border:none;border-radius:8px;
      padding:4px 12px;font-size:12.5px;font-weight:800;cursor:pointer;font-family:inherit}
    .vsim .vs-mini:hover{filter:brightness(1.1)}
    .vsim .vs-mini.g{background:#555}
    .vsim textarea.vs-prompt{width:100%;min-height:120px;resize:vertical;border:1px solid #cfcfe0;
      border-radius:10px;padding:12px 14px;font-family:'Fira Code',Consolas,monospace;font-size:14.5px;
      line-height:1.6;color:#1a1a2e;background:#fbfbfe}
    .vsim textarea.vs-prompt:focus{outline:2px solid var(--p,#4A90D9);border-color:transparent}
    .vsim textarea.vs-prompt.vs-prompt-tall{min-height:220px}
    /* 參考程式輸入框（第 2 段起，由使用者自己貼上上一段成果） */
    .vsim textarea.vs-ref{min-height:150px;background:#f6f7fb;border-color:#b9c6e8}
    .vsim textarea.vs-ref:focus{outline:2px solid var(--gold,#F5A623)}
    .vsim .vs-hint-need{font-size:12.5px;color:#a06a00;margin:6px 0 2px}
    /* 第 2 段起：說明「先貼參考程式＋提示詞建議」的對話框提示 */
    .vsim .vs-chatnote{font-size:13.5px;color:#274690;background:#eef3ff;border:1px solid #c3d3f5;
      border-radius:8px;padding:8px 11px;margin-bottom:10px;line-height:1.55}
    .vsim .vs-chatnote b{color:#1a3a8a}
    .vsim .vs-send{margin-top:10px;background:linear-gradient(135deg,#27AE60,#2ECC71);color:#fff;border:none;
      border-radius:10px;padding:11px 26px;font-size:16px;font-weight:900;cursor:pointer;font-family:inherit}
    .vsim .vs-send:hover{filter:brightness(1.06)}
    .vsim .vs-send:disabled{opacity:.5;cursor:default;filter:none}
    /* 生成結果 */
    .vsim .vs-out-wrap{margin-top:14px}
    .vsim .vs-added{font-size:13.5px;color:#7a5c00;background:#fff8e1;border:1px solid var(--gold,#F5A623);
      border-radius:8px;padding:7px 11px;margin-bottom:8px;line-height:1.5}
    .vsim pre.vs-output{background:#12121e;color:#e6e6f0;border-radius:10px;padding:14px 16px;margin:0;
      font-family:'Fira Code',Consolas,monospace;font-size:14px;line-height:1.6;white-space:pre-wrap;
      word-break:break-word;max-height:340px;overflow:auto;min-height:40px}
    .vsim pre.vs-output .cur{color:var(--gold,#F5A623);animation:vsblink 1s steps(1) infinite}
    /* 前面已完成、被「貼進對話框」的程式：以較暗色呈現，凸顯 AI 是在其基礎上續寫 */
    .vsim pre.vs-output .vs-prev{color:#7a7a90}
    @keyframes vsblink{50%{opacity:0}}
    .vsim .vs-think{color:#9aa4b2;font-family:'Fira Code',Consolas,monospace;font-size:14px}
    .vsim .vs-skip{font-size:12.5px;color:#8a8a9a;margin-top:5px}
    .vsim .vs-accept{margin-top:10px;background:var(--p,#4A90D9);color:#fff;border:none;border-radius:10px;
      padding:10px 22px;font-size:15px;font-weight:900;cursor:pointer;font-family:inherit}
    .vsim .vs-accept:hover{filter:brightness(1.08)}
    /* 累積檔案面板 */
    .vsim .vs-cumu{margin-top:16px;border-top:2px dashed #e0e0ee;padding-top:12px}
    .vsim pre.vs-fileview{background:#1e1e2e;color:#e6e6f0;border-radius:10px;padding:14px 16px;margin:0;
      font-family:'Fira Code',Consolas,monospace;font-size:13px;line-height:1.55;white-space:pre-wrap;
      word-break:break-word;max-height:300px;overflow:auto;min-height:44px}
    .vsim pre.vs-fileview .empty{color:#6a6a80}
    /* 完成慶祝 */
    .vsim .vs-done-msg{background:linear-gradient(135deg,#e8f8ee,#f0fbf4);border:2px solid #27AE60;
      color:#1c6b3f;border-radius:12px;padding:16px 18px;margin-top:6px;font-size:16px;line-height:1.6}
    .vsim .vs-done-msg b{font-size:18px}
    @media(max-width:640px){
      .vsim{padding:14px}
      .vsim .vs-file{font-size:16px}
      .vsim .vs-goal-title{font-size:17px}
    }`;
    const st = document.createElement('style');
    st.id = 'vsim-style';
    st.textContent = css;
    document.head.appendChild(st);
  }

  // ---------- 2. 小工具 ----------
  function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  // ---------- 3. 掛載一個生成器 ----------
  function mount(host, gen) {
    // 狀態：目前在第幾個目標、已併入的程式段落
    const state = { idx: 0, parts: [], typing: null };

    // 3-1 骨架
    host.classList.add('vsim');
    host.innerHTML = '';

    const head = el('div', 'vs-head');
    head.appendChild(el('span', 'vs-file', '🧩 生成器 · ' + esc(gen.file)));
    const prog = el('span', 'vs-prog');
    head.appendChild(prog);
    host.appendChild(head);

    if (gen.intro) host.appendChild(el('div', 'vs-intro', esc(gen.intro)));

    // 固定顯示「怎麼操作」三步驟，讓學員一眼看懂流程（不必先點才知道）
    host.appendChild(el('div', 'vs-how',
      '<b>怎麼操作（一段一段疊）：</b><br>' +
      '<span class="n">1</span>複製下面的<b>提示詞建議</b>（可自己小改）→ 貼進對話框 → 按<b>送出</b>。<br>' +
      '<span class="n">2</span><b>第 2 段起</b>：先把你<b>上一段生成好的程式</b>貼上／按「帶入上一段成果」放進<b>參考程式</b>框，再送出。<br>' +
      '<span class="n">3</span>生成後按<b>「採用」</b>把這段疊進檔案；全部做完就能<b>下載</b>整個檔案。'));

    const dots = el('div', 'vs-dots');
    host.appendChild(dots);

    const stage = el('div', 'vs-stage');
    host.appendChild(stage);

    // 累積檔案面板
    const cumu = el('div', 'vs-cumu');
    const cumuLbl = el('div', 'vs-lbl');
    const fileTitle = el('span', null, '📄 目前的 ' + esc(gen.file));
    cumuLbl.appendChild(fileTitle);
    cumuLbl.appendChild(el('span', 'sp'));
    const btnCopyAll = el('button', 'vs-mini g', '複製');
    const btnDl = el('button', 'vs-mini', '下載');
    cumuLbl.appendChild(btnCopyAll);
    cumuLbl.appendChild(btnDl);
    cumu.appendChild(cumuLbl);
    const fileView = el('pre', 'vs-fileview', '<span class="empty">// 還沒有內容，完成第一個目標後這裡就會長出程式…</span>');
    cumu.appendChild(fileView);
    host.appendChild(cumu);

    // 3-2 累積程式的組合字串
    function assembled() {
      return state.parts.join('\n\n\n');
    }
    function refreshFileView() {
      const code = assembled();
      fileView.innerHTML = code
        ? esc(code)
        : '<span class="empty">// 還沒有內容，完成第一個目標後這裡就會長出程式…</span>';
      fileTitle.textContent = '📄 目前的 ' + gen.file + '（已完成 ' + state.parts.length + '/' + gen.goals.length + '）';
    }
    function refreshProg() {
      prog.textContent = state.idx < gen.goals.length
        ? ('目標 ' + (state.idx + 1) + ' / ' + gen.goals.length)
        : ('完成 ' + gen.goals.length + ' / ' + gen.goals.length + ' 🎉');
      dots.innerHTML = '';
      gen.goals.forEach((g, i) => {
        let c = 'd';
        if (i < state.idx) c += ' done';
        else if (i === state.idx) c += ' cur';
        const d = el('div', c, i < state.idx ? '✓' : String(i + 1));
        d.title = g.title;
        dots.appendChild(d);
      });
    }

    // 3-3 下載 / 複製整檔
    btnDl.onclick = function () {
      const blob = new Blob([assembled() + '\n'], { type: 'text/plain;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = gen.file.split('/').pop();
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    };
    btnCopyAll.onclick = function () {
      navigator.clipboard.writeText(assembled()).then(() => {
        btnCopyAll.textContent = '已複製!';
        setTimeout(() => (btnCopyAll.textContent = '複製'), 1200);
      });
    };

    // 3-4 渲染「目前這個目標」的卡片
    function renderGoal() {
      const g = gen.goals[state.idx];
      stage.innerHTML = '';

      stage.appendChild(el('div', 'vs-goal-title',
        '<span class="num">目標 ' + (state.idx + 1) + '</span>　' + esc(g.title)));
      if (g.note) stage.appendChild(el('div', 'vs-goal-note', esc(g.note)));

      // 這一段之前已疊好的程式（標準解答）；第 2 段起要「使用者自己上傳參考程式」
      const prevCode = assembled();
      const isFirst = state.idx === 0;

      // --- 第 2 段起：① 參考程式（由使用者自己貼上／帶入上一段生成的程式）---
      let refBox = null;
      if (!isFirst) {
        stage.appendChild(el('div', 'vs-chatnote',
          '💬 就像真的在接續開發：<b>先把你上一段生成好的程式當「參考程式」貼進來</b>，' +
          '再複製下面的提示詞建議、送出，AI 就會在你的參考程式上繼續，回傳到這一段為止的完整程式。'));

        const refLbl = el('div', 'vs-lbl', '① 參考程式（貼上你上一段生成好的程式）<span class="sp"></span>');
        const btnFill = el('button', 'vs-mini', '⬆️ 帶入上一段成果');
        refLbl.appendChild(btnFill);
        stage.appendChild(refLbl);

        refBox = el('textarea', 'vs-prompt vs-ref');
        refBox.spellcheck = false;
        refBox.placeholder = '在這裡貼上你上一段生成好的程式…（或按右上角「帶入上一段成果」）';
        stage.appendChild(refBox);

        btnFill.onclick = function () {
          refBox.value = prevCode;
          btnFill.textContent = '已帶入 ✓';
          refBox.dispatchEvent(new Event('input'));
          setTimeout(() => (btnFill.textContent = '⬆️ 帶入上一段成果'), 1200);
        };
      }

      // --- ② 提示詞建議（可複製、可小改，貼進對話框）---
      const lbl = el('div', 'vs-lbl',
        (isFirst ? '💡 提示詞建議（複製、可小改，再送出）'
                 : '② 提示詞建議（複製、可小改，貼進對話框）') +
        '<span class="sp"></span>');
      const btnCopy = el('button', 'vs-mini', '複製提示詞');
      lbl.appendChild(btnCopy);
      stage.appendChild(lbl);

      const promptText = g.prompt;
      const ta = el('textarea', 'vs-prompt');
      ta.value = promptText;
      ta.spellcheck = false;
      stage.appendChild(ta);

      btnCopy.onclick = function () {
        navigator.clipboard.writeText(ta.value).then(() => {
          btnCopy.textContent = '已複製!';
          setTimeout(() => (btnCopy.textContent = '複製提示詞'), 1200);
        });
      };

      const btnSend = el('button', 'vs-send', '送出 ▶');
      // 第 2 段起：沒貼上參考程式不能送出（讓使用者確實做這個動作、才有參與感）
      function syncSendEnabled() {
        if (isFirst) return;
        btnSend.disabled = !(refBox && refBox.value.trim());
      }
      if (!isFirst) {
        refBox.addEventListener('input', syncSendEnabled);
        syncSendEnabled();
        stage.appendChild(el('div', 'vs-hint-need', '＊送出前，請先貼上／帶入「參考程式」。'));
      }
      stage.appendChild(btnSend);

      const outWrap = el('div', 'vs-out-wrap');
      outWrap.hidden = true;
      stage.appendChild(outWrap);

      btnSend.onclick = function () {
        if (!isFirst && !(refBox && refBox.value.trim())) return;   // 保險
        btnSend.disabled = true;
        ta.disabled = true;
        if (refBox) refBox.disabled = true;
        outWrap.hidden = false;
        outWrap.innerHTML = '';

        // 若學員在建議內容之外自己加了字，貼心回應一下（但程式仍輸出標準解答）
        const extra = extractExtra(ta.value, promptText);
        if (extra) {
          outWrap.appendChild(el('div', 'vs-added',
            '📎 已收到你的補充：「' + esc(extra.slice(0, 60)) + (extra.length > 60 ? '…' : '') +
            '」　（教學版會輸出標準解答，確保全班一致）'));
        }
        outWrap.appendChild(el('div', 'vs-lbl',
          isFirst ? '🤖 生成結果' : '🤖 生成結果（在你的參考程式上續寫 · 到這一段為止的完整程式）'));
        const think = el('div', 'vs-think', '🤔 Vibe 生成中');
        outWrap.appendChild(think);

        // 假思考動畫 → 逐字打出程式
        let dotN = 0;
        const thinkTimer = setInterval(() => {
          dotN = (dotN + 1) % 4;
          think.textContent = '🤔 Vibe 生成中' + '.'.repeat(dotN);
        }, 220);

        setTimeout(() => {
          clearInterval(thinkTimer);
          think.remove();
          // 第 2 段起：先秀出「目前的程式」(灰)，再逐字打出這段新增的部分；
          // 打完即為「到目前為止的完整程式」
          typeCumulative(outWrap, isFirst ? '' : prevCode, g.code, () => {
            const last = state.idx === gen.goals.length - 1;
            const acc = el('button', 'vs-accept',
              last ? '✅ 採用這份程式，完成！' : '✅ 採用這份程式，下一段');
            outWrap.appendChild(acc);
            acc.onclick = function () {
              state.parts.push(g.code);
              state.idx++;
              refreshFileView();
              refreshProg();
              if (state.idx < gen.goals.length) {
                renderGoal();
                host.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
              } else {
                renderDone();
              }
            };
          });
        }, 850);
      };

      refreshProg();
    }

    // 3-5 全部完成
    function renderDone() {
      stage.innerHTML = '';
      const msg = el('div', 'vs-done-msg',
        '<b>🎉 ' + esc(gen.file) + ' 完成！</b><br>' +
        '你剛剛用「一個目標、一段提示詞」的方式，一塊一塊把整個檔案疊出來了。<br>' +
        '這份程式和老師成品的內容一致 ✅　可以按下方「下載」存成 <code>' + esc(gen.file) + '</code>。');
      stage.appendChild(msg);
      refreshProg();
    }

    // 初始化
    refreshFileView();
    renderGoal();
  }

  // ---------- 4. 逐字打字動畫（可點擊略過） ----------
  //   prevCode：這段之前已完成、被「貼進對話框」的程式，先直接印出來（灰色），
  //             代表 AI 是在你貼上的程式基礎上「續寫」；新的一段才逐字打出。
  //   打完後 pre 的內容 = 到這一段為止的完整程式。
  function typeCumulative(wrap, prevCode, code, onDone) {
    const pre = el('pre', 'vs-output', '');
    wrap.appendChild(pre);
    const skip = el('div', 'vs-skip', '（正在輸入…點一下程式框可略過動畫）');
    wrap.appendChild(skip);

    // 前綴用和 assembled() 相同的段落間隔（\n\n\n），確保「灰底舊碼 + 新碼」= 完整檔
    const prefix = prevCode ? '<span class="vs-prev">' + esc(prevCode) + '</span>\n\n\n' : '';

    // 刻意放慢，做出「AI 正在串流吐程式」的感覺（可點框略過）：
    //   每段約 2.6～7 秒，長段落也不會拖太久；短段落至少看得到過程。
    const INTERVAL = 24;                                   // 每個 tick 的毫秒
    const durationMs = Math.min(7000, Math.max(2600, code.length * 8));
    const totalTicks = Math.max(1, durationMs / INTERVAL);
    const step = Math.max(1, Math.round(code.length / totalTicks));

    let i = 0;
    let finished = false;

    function finish() {
      if (finished) return;
      finished = true;
      clearInterval(timer);
      pre.innerHTML = prefix + esc(code);
      skip.remove();
      pre.scrollTop = pre.scrollHeight;
      if (onDone) onDone();
    }
    pre.onclick = finish;

    const timer = setInterval(() => {
      i += step;
      if (i >= code.length) { finish(); return; }
      // 灰色舊碼 + 已打出的新碼 + 閃爍游標
      pre.innerHTML = prefix + esc(code.slice(0, i)) + '<span class="cur">▋</span>';
      pre.scrollTop = pre.scrollHeight;
    }, INTERVAL);
  }

  // ---------- 5. 找出學員在建議提示詞之外自己加的字 ----------
  function extractExtra(current, base) {
    const c = (current || '').trim();
    const b = (base || '').trim();
    if (c === b) return '';
    // 若學員是在原提示詞後面追加，抓出多出來的尾巴
    if (c.startsWith(b)) return c.slice(b.length).trim();
    // 否則視為整段自訂，回傳前段當摘要
    return c;
  }

  // ---------- 6. 自動掃描頁面上的掛載點 ----------
  function autoMount() {
    injectStyleOnce();
    const nodes = document.querySelectorAll('.vsim[data-gen]');
    nodes.forEach((host) => {
      if (host.dataset.vsimMounted) return;      // 避免重複掛載
      const key = host.dataset.gen;
      const gen = (window.VIBE_GENERATORS || {})[key];
      if (!gen) {
        host.innerHTML = '<div style="color:#c00;padding:12px">⚠ 找不到生成器資料：' + esc(key) +
          '（請確認已載入 vibe-gen-data.js）</div>';
        return;
      }
      host.dataset.vsimMounted = '1';
      mount(host, gen);
    });
  }

  // 對外暴露，方便手動呼叫
  window.VibeSim = { mount, autoMount };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoMount);
  } else {
    autoMount();
  }
})();
