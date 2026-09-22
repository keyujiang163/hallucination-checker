# finalize-remote.ps1 - 一键收尾 push + PATCH metadata
# 用法(在能上 github.com 的环境):
#   $env:GITHUB_TOKEN = "<PAT, 勾 repo + metadata:write>"
#   pwsh -File finalize-remote.ps1
$ErrorActionPreference = "Stop"
$Repo = "keyujiang163/hallucination-checker"

# 1) push 两个本地 commit
git push https://github.com/$Repo.git main

# 2) PATCH repo metadata
$body = @"
{
  "description": "Lightweight AI hallucination checker: split claims + web-search verify + green/red badges.",
  "homepage": "https://github.com/$Repo#readme",
  "topics": ["hallucination-checker", "fact-check", "llm", "ai-safety", "verification", "nodejs", "express"],
  "license": "MIT"
}
"@
Invoke-RestMethod -Method PATCH -Uri "https://api.github.com/repos/$Repo" `
  -Headers @{ Authorization = "Bearer $env:GITHUB_TOKEN"; Accept = "application/vnd.github+json" } `
  -ContentType "application/json" -Body $body | Format-List description, license, topics