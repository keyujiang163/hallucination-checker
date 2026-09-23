# openclaw-audit — 子代理日志强制 + 死因判定
> **解决什么**:Dev 子代理超时死,主会话只能翻日志猜死因 —— 本 skill 强制写结构化日志,死前 SUMMARY 一段交代清楚。
> **给谁用**:OpenClaw 子代理重度用户 + 老板本人(救翻车现场)

## 3 步上手
1. 在主会话 spawn 前:const audit = require('./skills/day3-batch1/openclaw-audit/audit')
2. wrap 你的 exec 调用:const wrap = audit.wrap(execFn, 'task-name')
3. 子代理失败时:查看 $env:TEMP\dev-run-task-name-<时间>.log 末尾 SUMMARY 段

## 真实案例
输入(主会话):
  const audit = require('./openclaw-audit');
  const wrap = audit.wrap(exec, 'design-day3-batch1');
  await wrap(...)
输出(子代理死后日志末尾 SUMMARY 段):
  === SUMMARY ===
    task: design-day3-batch1
    runtime: 21m23s
    status: failed
    error: This operation was aborted | 20
    last_action: "Build docs/skills/index.html"
    probable_cause: 25min 顶位超时
    log_path: C:\\Users\\Administrator\\AppData\\Local\\Temp\\dev-run-design-day3-batch1-20260923-103245.log

## 限制说明
- 不改子代理行为,只 wrap
- Windows PS 5.1 兼容(不用 ES2022)
- 日志默认 $env:TEMP(可改 audit.createLogger 自定义)

## 文件
- SKILL.md(本文)
- audit.js(wrap + createLogger + summary)
- test.js(自测)
