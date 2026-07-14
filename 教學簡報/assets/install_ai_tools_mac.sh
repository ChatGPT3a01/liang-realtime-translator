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
say "Google Antigravity（桌面 IDE，選配）：請由官方頁下載對應版本（Apple 晶片 / Intel）：" "$CYAN"
say "https://antigravity.google/download" ""
open "https://antigravity.google/download" 2>/dev/null
echo ""
say "Codex 桌面板（進階／選配）" "$CYAN"
say "OpenAI 官方桌面版僅 macOS 但未上架 Homebrew；終端機版 Codex 上面已裝好。" ""
say "若你（在老師說明後）想要桌面板，可到這個社群 releases 頁下載 mac 的 .dmg：" ""
say "https://github.com/Haleclipse/CodexDesktop-Rebuild/releases" ""
say "⚠️ 這是社群版、非 OpenAI 官方，會經手你的金鑰與程式碼，請自行斟酌。" "$YELLOW"
open "https://github.com/Haleclipse/CodexDesktop-Rebuild/releases" 2>/dev/null
echo ""
say "安裝後測試指令（在終端機輸入）：" "$CYAN"
echo "  node --version"; echo "  git --version"; echo "  python3 --version"
echo "  code --version"; echo "  claude --version"; echo "  codex --version"; echo "  agy --version"
echo ""
if [ ${#FAILED[@]} -gt 0 ]; then say "以下項目需要重裝或人工處理：${FAILED[*]}" "$RED"; else say "安裝完成！請關閉終端機再重開，讓設定生效。" "$GREEN"; fi
echo ""
say "完成。可關閉此視窗。" "$GREEN"
