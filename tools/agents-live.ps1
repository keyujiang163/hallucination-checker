# tools/agents-live.ps1
# Live tail 子代理进度日志(老板实时围观用,类似 Linux tail -f)
# 跑法:pwsh tools/agents-live.ps1
# 或:powershell -ExecutionPolicy Bypass -File tools/agents-live.ps1
# 老板随时另开终端跑,push 模式不影响主会话、不影响子代理

[CmdletBinding()]
param(
    [string]$Path,
    [int]$RefreshSeconds = 1
)

$ErrorActionPreference = 'Stop'

# 默认 log 路径 = 项目根 agents-live.log
if (-not $Path) {
    $scriptRoot = if ($PSScriptRoot) { $PSScriptRoot } else { (Get-Location).Path }
    $candidate = Join-Path $scriptRoot '..\agents-live.log'
    if (Test-Path $candidate) {
        $Path = [System.IO.Path]::GetFullPath($candidate)
    } else {
        $Path = (Join-Path (Get-Location).Path 'agents-live.log')
    }
}

# 不存在就建空文件
if (-not (Test-Path $Path)) {
    Write-Host "[$(Get-Date -Format o)] [agents-live] creating: $Path" -ForegroundColor Yellow
    New-Item -ItemType File -Path $Path -Force | Out-Null
}

Write-Host "==== agents-live tail started: $Path ====" -ForegroundColor Cyan
Write-Host "==== Ctrl+C to stop / 老板可用 split-pane:tail ====" -ForegroundColor DarkGray
Write-Host ""

# tail -f 等价:每 1 秒扫一次增量(从 lastSize 到 curSize 读增量)
$lastSize = (Get-Item $Path).Length
while ($true) {
    try {
        if (Test-Path $Path) {
            $curSize = (Get-Item $Path).Length
            if ($curSize -gt $lastSize) {
                $fs = [System.IO.File]::Open($Path, 'Open', 'Read', 'ReadWrite')
                $fs.Position = $lastSize
                $sr = New-Object System.IO.StreamReader($fs, [System.Text.UTF8Encoding]::new($false))
                while (-not $sr.EndOfStream) {
                    Write-Host $sr.ReadLine()
                }
                $sr.Close()
                $fs.Close()
                $lastSize = $curSize
            }
        }
    } catch {
        Write-Host "[$(Get-Date -Format o)] [error] $_" -ForegroundColor Red
    }
    Start-Sleep -Seconds $RefreshSeconds
}
