#!/bin/bash
# 亮言 · AI 教學工具一鍵安裝（macOS）— 用 Homebrew，已裝的會自動略過
set +e
GREEN=$'\033[0;32m'; YELLOW=$'\033[0;33m'; CYAN=$'\033[0;36m'; RED=$'\033[0;31m'; NC=$'\033[0m'
say(){ printf "%s%s%s\n" "$2" "$1" "$NC"; }
say "亮言 · AI 教學工具一鍵安裝程式（macOS）" "$CYAN"
say "本程式用 Homebrew 安裝，已存在的項目會自動略過。" ""
echo ""
if ! command -v brew >/dev/null 2>&1; then
  say "未偵測到 Homebrew，開始安裝官方 Homebrew（可能會要你輸入 Mac 開機密碼）..." "$YELLOW"
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  eval "$(/opt/homebrew/bin/brew shellenv 2>/dev/null)" 2>/dev/null || eval "$(/usr/local/bin/brew shellenv 2>/dev/null)" 2>/dev/null
fi
if ! command -v brew >/dev/null 2>&1; then
  say "Homebrew 安裝後仍找不到，請關掉終端機重開，再執行一次本程式。" "$RED"; exit 2
fi
FAILED=()
inf(){ if brew list "$1" >/dev/null 2>&1; then say "已存在，略過：$1" "$GREEN"; else say "安裝中：$1" "$YELLOW"; brew install "$1" || FAILED+=("$1"); fi; }
inc(){ if brew list --cask "$1" >/dev/null 2>&1; then say "已存在，略過：$1" "$GREEN"; else say "安裝中：$1" "$YELLOW"; brew install --cask "$1" || FAILED+=("$1"); fi; }
inf node
inf git
inf python@3.12
inc visual-studio-code
inc chatgpt
inc claude
inc claude-code
inc codex
echo ""
say "安裝中：Google Antigravity CLI（官方，指令 agy）" "$YELLOW"
curl -fsSL https://antigravity.google/cli/install.sh | bash || FAILED+=("Antigravity CLI")
echo ""
say "安裝中：Google Antigravity（桌面 IDE）" "$YELLOW"
inc antigravity
echo ""
say "安裝中：Codex 桌面板（社群版，老師已審過）— 檔案約 600MB，請耐心等候..." "$YELLOW"
CDX_TMP=$(mktemp -d)
if [ "$(uname -m)" = "arm64" ]; then CDX_PAT="Codex-mac-arm64"; else CDX_PAT="Codex-mac-x64"; fi
CDX_URL=$(curl -fsSL https://api.github.com/repos/Haleclipse/CodexDesktop-Rebuild/releases/latest | grep browser_download_url | grep "$CDX_PAT" | head -1 | cut -d'"' -f4)
if [ -n "$CDX_URL" ]; then
  say "下載：$(basename "$CDX_URL")" ""
  if curl -fL "$CDX_URL" -o "$CDX_TMP/codex.dmg"; then
    MP=$(hdiutil attach "$CDX_TMP/codex.dmg" -nobrowse -noautoopen 2>/dev/null | grep -o '/Volumes/.*' | tail -1)
    APP=$(find "$MP" -maxdepth 1 -name "*.app" 2>/dev/null | head -1)
    if [ -n "$APP" ]; then
      rm -rf "/Applications/$(basename "$APP")" 2>/dev/null
      cp -R "$APP" /Applications/ && xattr -dr com.apple.quarantine "/Applications/$(basename "$APP")" 2>/dev/null \
        && say "Codex 桌面板已安裝到「應用程式」。" "$GREEN" || { say "Codex 桌面板複製失敗。" "$RED"; FAILED+=("Codex 桌面板"); }
    else
      say "掛載 dmg 後找不到 App。" "$RED"; FAILED+=("Codex 桌面板")
    fi
    [ -n "$MP" ] && hdiutil detach "$MP" >/dev/null 2>&1
  else
    say "Codex 桌面板下載失敗。" "$RED"; FAILED+=("Codex 桌面板")
  fi
else
  say "找不到 Codex 桌面板 mac 資產，略過。" "$RED"; FAILED+=("Codex 桌面板")
fi
rm -rf "$CDX_TMP"
echo ""
say "安裝後測試指令（在終端機輸入）：" "$CYAN"
echo "  node --version"; echo "  git --version"; echo "  python3 --version"
echo "  code --version"; echo "  claude --version"; echo "  codex --version"; echo "  agy --version"
echo ""
if [ ${#FAILED[@]} -gt 0 ]; then say "以下項目需要重裝或人工處理：${FAILED[*]}" "$RED"; else say "安裝完成！請關閉終端機再重開，讓設定生效。" "$GREEN"; fi
echo ""
say "完成。可關閉此視窗。" "$GREEN"
