# dev-runner — 子代理防超时包装
> **解决什么**:Dev 子代理 25min 顶位超时静默死,主会话不知道 —— 本 skill 强制到点写日志 + 返回超时标记。
> **给谁用**:OpenClaw 主会话调度人 / spawn 重度用户

## 3 步上手
1. 引入:const run = require('./skills/day3-batch1/dev-runner/runner')
2. 包装你的任务:const result = await run({ task: 'my-task', timeoutMs: 25*60*1000, fn: async () => {...} })
3. 查 result.timedOut === true 即上报老板(不静默等死)

## 真实案例
输入:
  const result = await run({
    task: 'design-day3-batch1',
    timeoutMs: 1500000,
    fn: () => longSubagent()
  });
输出:
  {
    ok: false,
    timedOut: true,
    duration: 1500234,
    error: 'TIMEOUT_AT 2026-09-23T10:53:00',
    logPath: 'C:\\Users\\...\\TEMP\\dev-runner-design-day3-batch1-...log'
  }

## 限制说明
- 不擅自重试(超时即返回,主会话决定下一步)
- 默认 25min 顶位(可调 timeoutMs)
- 日志路径返回在 result.logPath
- 跟 openclaw-audit 配套用更稳

## 文件
- SKILL.md(本文)
- runner.js(主程序)
- test.js(自测)
