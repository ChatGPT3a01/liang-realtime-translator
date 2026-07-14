#requires -Version 5.1

$ErrorActionPreference = 'Continue'
$ProgressPreference = 'SilentlyContinue'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $Root) { if ($PSScriptRoot) { $Root = $PSScriptRoot } elseif ($PWD) { $Root = $PWD.Path } else { $Root = $env:TEMP } }
$LogPath = Join-Path $Root 'install-log.txt'

# Windows PowerShell 5.1 對 UTF-8 的處理不一致，因此明確使用 UTF-8 BOM 輸出記錄。
'' | Out-File -FilePath $LogPath -Encoding utf8

function Write-Ui {
    param([string]$Message, [ConsoleColor]$Color = [ConsoleColor]::White)
    Write-Host $Message -ForegroundColor $Color
    $Message | Out-File -FilePath $LogPath -Append -Encoding utf8
}

function Test-Admin {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($identity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Install-WingetPackage {
    param(
        [string]$Name,
        [string]$Id
    )

    Write-Ui "正在檢查：$Name ..." Cyan
    & winget list --id $Id --exact --accept-source-agreements 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Ui "已存在，略過安裝：$Name" Green
        return $true
    }

    Write-Ui "開始安裝：$Name" Yellow
    & winget install --id $Id --exact --silent --accept-package-agreements --accept-source-agreements
    if ($LASTEXITCODE -eq 0) {
        Write-Ui "安裝完成：$Name" Green
        return $true
    }

    Write-Ui "安裝失敗或需要人工確認：$Name（錯誤碼：$LASTEXITCODE）" Red
    return $false
}

function Refresh-Path {
    $machinePath = [Environment]::GetEnvironmentVariable('Path', 'Machine')
    $userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
    $env:Path = "$machinePath;$userPath"
}

function Install-CodexCli {
    Write-Ui '開始安裝：OpenAI Codex CLI' Yellow
    Refresh-Path
    $npm = Get-Command npm.cmd -ErrorAction SilentlyContinue
    if (-not $npm) {
        $npmPath = Join-Path ${env:ProgramFiles} 'nodejs\npm.cmd'
        if (Test-Path $npmPath) { $npm = Get-Item $npmPath }
    }
    if (-not $npm) {
        Write-Ui '找不到 npm，無法安裝 Codex CLI。請重新開啟本安裝器後再試。' Red
        return $false
    }
    $npmCommand = $npm.Source
    if (-not $npmCommand) { $npmCommand = $npm.FullName }
    & $npmCommand install --global '@openai/codex'
    if ($LASTEXITCODE -eq 0) {
        Write-Ui 'Codex CLI 安裝完成。重新開啟 Terminal 後輸入 codex 即可啟動。' Green
        return $true
    }
    Write-Ui "Codex CLI 安裝失敗（錯誤碼：$LASTEXITCODE）" Red
    return $false
}

function Install-AntigravityCli {
    Write-Ui '開始安裝：Google Antigravity CLI（官方，指令 agy）' Yellow
    try {
        Invoke-Expression (Invoke-RestMethod 'https://antigravity.google/cli/install.ps1')
        Write-Ui 'Antigravity CLI 安裝完成。重新開啟 Terminal 後輸入 agy 即可啟動。' Green
        return $true
    } catch {
        Write-Ui "Antigravity CLI 安裝失敗：$($_.Exception.Message)" Red
        return $false
    }
}

Clear-Host
Write-Ui 'AI 教學工具一鍵安裝程式' Magenta
Write-Ui '本程式會檢查已安裝的軟體，已存在的項目不會重複安裝。' White
Write-Ui "安裝記錄：$LogPath" DarkGray
Write-Ui ''

if (-not (Test-Admin)) {
    Write-Ui '提示：部分軟體可能需要系統管理員權限。若出現權限視窗，請按「是」。' Yellow
}

if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
    Write-Ui '找不到 winget。請先從 Microsoft Store 更新「應用程式安裝程式」，再重新執行本程式。' Red
    Write-Ui '本程式不會自行下載不明的 winget 安裝檔，以避免學員電腦遭到植入風險。' Yellow
    exit 2
}

$packages = @(
    @{ Name = 'Node.js LTS'; Id = 'OpenJS.NodeJS.LTS' },
    @{ Name = 'Git'; Id = 'Git.Git' },
    @{ Name = 'Notepad++'; Id = 'Notepad++.Notepad++' },
    @{ Name = 'Python 3.12'; Id = 'Python.Python.3.12' },
    @{ Name = 'Visual Studio Code'; Id = 'Microsoft.VisualStudioCode' },
    @{ Name = 'ChatGPT'; Id = '9NT1R1C2HH7J' },
    @{ Name = 'Claude'; Id = 'Anthropic.Claude' },
    @{ Name = 'Claude Code'; Id = 'Anthropic.ClaudeCode' }
)

$failed = New-Object System.Collections.Generic.List[string]
foreach ($package in $packages) {
    if (-not (Install-WingetPackage -Name $package.Name -Id $package.Id)) {
        [void]$failed.Add($package.Name)
    }
    Write-Ui ''
}

if (-not (Install-CodexCli)) {
    [void]$failed.Add('OpenAI Codex CLI')
}
Write-Ui ''

if (-not (Install-AntigravityCli)) {
    [void]$failed.Add('Antigravity CLI')
}
Write-Ui ''

Write-Ui 'Google Antigravity（桌面 IDE）' Cyan
if (-not (Install-WingetPackage -Name 'Google Antigravity IDE' -Id 'Google.Antigravity')) {
    if (-not (Install-WingetPackage -Name 'Google Antigravity IDE（備援 ID）' -Id 'Google.AntigravityIDE')) {
        [void]$failed.Add('Google Antigravity IDE')
    }
}

Write-Ui ''
Write-Ui 'Codex 桌面板（社群版，老師已審過）' Cyan
Write-Ui '從社群 releases 自動下載 Windows 版並解壓安裝（檔案約 600MB，請耐心等候）...' Yellow
try {
    $rel = Invoke-RestMethod 'https://api.github.com/repos/Haleclipse/CodexDesktop-Rebuild/releases/latest' -Headers @{ 'User-Agent' = 'liang-installer' }
    $asset = $rel.assets | Where-Object { $_.name -like 'Codex-win-x64-*.zip' } | Select-Object -First 1
    if (-not $asset) { throw '找不到 Windows 版資產（Codex-win-x64-*.zip）' }
    $zipPath = Join-Path $env:TEMP $asset.name
    $destDir = Join-Path $env:LOCALAPPDATA 'CodexDesktop'
    Write-Ui ('下載：' + $asset.name) White
    Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $zipPath -UseBasicParsing
    if (Test-Path $destDir) { Remove-Item $destDir -Recurse -Force -ErrorAction SilentlyContinue }
    New-Item -ItemType Directory -Path $destDir -Force | Out-Null
    Write-Ui '解壓中...' White
    Expand-Archive -Path $zipPath -DestinationPath $destDir -Force
    Remove-Item $zipPath -Force -ErrorAction SilentlyContinue
    $exe = Get-ChildItem -Path $destDir -Recurse -Filter '*.exe' -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -notmatch 'unins|update|crash|helper|setup|elevate' } | Select-Object -First 1
    if ($exe) {
        $ws = New-Object -ComObject WScript.Shell
        foreach ($lnkDir in @([Environment]::GetFolderPath('Desktop'), (Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs'))) {
            try {
                $lnk = $ws.CreateShortcut((Join-Path $lnkDir 'Codex 桌面板.lnk'))
                $lnk.TargetPath = $exe.FullName; $lnk.WorkingDirectory = $exe.DirectoryName; $lnk.Save()
            } catch {}
        }
        Write-Ui ('Codex 桌面板安裝完成，桌面與開始功能表已建立捷徑。主程式：' + $exe.FullName) Green
    } else {
        Write-Ui ('已解壓到：' + $destDir + '，但找不到主程式 exe，請手動進資料夾開啟。') Yellow
    }
} catch {
    Write-Ui ('Codex 桌面板安裝失敗：' + $_.Exception.Message) Red
    [void]$failed.Add('Codex 桌面板')
}

Write-Ui ''
Write-Ui 'CLAW 小龍蝦' Cyan
Write-Ui 'CLAW 尚未自動執行未知腳本。請將已確認安全的 CLAW 資料夾放在本安裝器旁邊的 CLAW 資料夾，再重新執行。' Yellow
Write-Ui '這樣可以避免學員在沒有檢查內容時，直接執行來源不明的程式。' Yellow

$clawPath = Join-Path $Root 'CLAW'
if (Test-Path $clawPath) {
    Write-Ui '偵測到 CLAW 資料夾，開始尋找安裝腳本。' Cyan
    $scripts = Get-ChildItem -Path $clawPath -Recurse -File -Include '*.bat','*.cmd','*.ps1' -ErrorAction SilentlyContinue
    if ($scripts.Count -eq 1) {
        Write-Ui "找到腳本：$($scripts[0].Name)" White
        Write-Ui '為安全起見，第一版不會自動執行未知腳本；請先人工確認後再執行。' Yellow
    } elseif ($scripts.Count -gt 1) {
        Write-Ui 'CLAW 中有多個腳本，尚未自動選擇，以免執行錯誤腳本。' Yellow
    } else {
        Write-Ui 'CLAW 資料夾中沒有找到 BAT、CMD 或 PS1 腳本。' Yellow
    }
} else {
    Write-Ui '尚未偵測到旁邊的 CLAW 資料夾。' Yellow
}

Write-Ui ''
Write-Ui '安裝後測試指令：' Cyan
Write-Ui 'node --version' White
Write-Ui 'git --version' White
Write-Ui 'python --version' White
Write-Ui 'code --version' White
Write-Ui 'claude --version' White
Write-Ui 'codex --version' White
Write-Ui 'agy --version' White
Write-Ui ''

if ($failed.Count -gt 0) {
    Write-Ui ('以下項目需要重新安裝或人工處理：' + ($failed -join '、')) Red
    exit 1
}

Write-Ui '第一階段安裝完成。請關閉目前所有 Terminal，再重新開啟，讓 PATH 設定生效。' Green
exit 0
