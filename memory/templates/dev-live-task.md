# Dev Live Task Template — 必带项(2026-09-23 老板拍 A+C)

> 每次派 Dev 子代理时,**主会话自动 append 这段到 task 末尾**。
> 老板从 day5-batch1 起所有 Dev 任务必带。day4-batch1 已完工,本模板为下批起效。

---

## Dev 运行诊断日志(原 SOUL 红线,继续保留)

1. 开局建日志文件:`$env:TEMP\dev-run-<TASKNAME>-<yyyyMMdd-HHmmss>.log`(回报第 1 行写绝对路径)
2. 每个 exec / edit / read 前后 >> "$log" 写一行:
   - 时间戳 (Get-Date -Format o)
   - 工具名 + 一句话意图
   - 关键结果(成功/失败 + exit code + 首行输出)
3. 重大决策点(git push / npm install / 跨域请求 / LLM 调用)写一段说明到 $log
4. 任务完成 / 超时 / 失败时,最后写一段 SUMMARY 到 $log(含:完成度 + 卡哪步 + 真错信息)

---

## Live 进度日志(新加,2026-09-23 C 拍板)

1. **追加写 `<项目根>/agents-live.log`**:每完成一个 exec / edit / read,**追加 1 行**(格式见下),不覆盖
2. **行格式**:`[ISO8601时间戳] [agent=dev] [工具=exec|edit|read] [意图=<一句话>] [结果=ok|err|<exit code>]`
   例:`[2026-09-23T16:34:01+08:00] [agent=dev] [工具=edit] [意图=写 auto-poster.js 87 行] [结果=ok]`
3. **里程碑触发**:每写完 1 个完整文件 + 自测 → 再追加 1 行 `[MILESTONE] <file> <行数> done`
   例:`[MILESTONE] tools/marketing-ops/auto-poster.js 87 done 1/6`
4. **失败必写**:每个失败 exec/edit 立刻追加 `[ERROR] <一句话 + exit code + 首行输出>`,不掩盖
5. **超时立刻写**:`[TIMEOUT_AT <时间>]` 到日志,主会话据此查真死因

---

## Progress 推送回主会话(新加,2026-09-23 A 拍板)

1. 每完成 1 个里程碑(1 个文件 + 自测通过)→ 用 `sessions_send` 给主会话发 1 条:
   `PROGRESS: <file> <行数> done, <当前>/<总数>`
2. 主会话收到后,自动转发飞书群(30 字短报,例:`✅ auto-poster.js 87 行 done, 1/6 — Dev`)
3. 失败不静默:任一里程碑失败 → 立刻 `PROGRESS_ERROR: <file> <一句话错误>`
4. **main sessionKey** 必带在 task 头部:`MAIN_SESSION=<agent:main:feishu:group:...:sender:ou_...>`(主会话 spawn 时自动注入)
5. **不能 sessions_send 的批次错**(网络/上下文)→ 直接写 agents-live.log 一行 `[MISS_PROGRESS] <原因>`,主会话从 log 拉

---

## 死因判定标准(取代"猜路径")

- **不写"我跑完了"** —— 只写 "Test-Path <文件路径> = <bool> + Get-Content 首行 = <内容>"
- **token / PAT / cookie / 凭据禁写日志**(mask 后 8 位,如 `ghp_Xw****zXGe`)
- **exec 输出里包含真错**(如 "fatal: Authentication failed")原样进日志,不掩盖
- **完成度 < 100% = 失败**(必须 N/N 文件 Test-Path=True 才算 PASS)

---

## 老板实时围观端口

老板随时开终端跑 `pwsh tools/agents-live.ps1`(PS 5.1+ 都行),实时看 `agents-live.log` 增量(类似 Linux `tail -f`)。
不影响主会话,不影响子代理。Push-based + 文件级透明两路并行。
