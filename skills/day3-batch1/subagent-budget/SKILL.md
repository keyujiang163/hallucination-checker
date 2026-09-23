# subagent-budget — 并发上限护栏
> **解决什么**:老板 SOUL 红线"并发 ≤2",实际跑过撞 5/5 平台硬限 —— 本 skill 强制 acquire/release 计数,撞上限自动排队。
> **给谁用**:OpenClaw 主会话调度 / 多 agent 并发场景

##  3 步上手
1. 引入:const budget = require('./skills/day3-batch1/subagent-budget/budget')
2. 用前 acquire:await budget.acquire('dev')
3. 用后 release:try { ... } finally { budget.release('dev') }

## 真实案例
输入(主会话):
  await budget.acquire('dev');  // 等到 slot 空闲才返回
  try {
    await spawnDev();
  } finally {
    budget.release('dev');  // 必释放
  }
输出(JSON 持久化 data/budget.json):
  {
    "dev": { "active": 1, "max": 2, "history": [...] },
    "design": { "active": 0, "max": 2, "history": [...] }
  }

## 限制说明
- 单机本地(不分布式锁)
- 默认上限 2(可在 budget.setLimit 调)
- acquire 是 FIFO 队列,等不到会 await
- release 必须配 try/finally 防止泄漏

## 文件
- SKILL.md(本文)
- budget.js(acquire/release/status/persist)
- test.js(自测)
