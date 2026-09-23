# Progress → Feishu 主会话推送规则

> 2026-09-23 老板拍 A。新规则,day5-batch1 起生效。

---

## 触发

子代理用 `sessions_send(sessionKey=main-session, message="PROGRESS: ...")` 把进度推回主会话。

主会话被 push 触发后,自动:
1. 解析 PROGRESS / PROGRESS_ERROR 消息
2. 调 `message` 工具,发飞书群短报
3. 短报格式:30 字内,标注 agent + 文件 + 进度

---

## 短报模板

```
✅ PROGRESS: <file> <行数> done, <当前>/<总数> — Dev
❌ PROGRESS_ERROR: <file> <一句话错误> — Dev 立刻上报
```

实际发送范例:
```
✅ auto-poster.js 87 行 done, 1/6 — Dev
✅ auto-funnel.js 93 行 done, 2/6 — Dev
✅ auto-cs.js 54 行 done, 3/6 — Dev
❌ auto-renew.js TypeError: cannot read property, 4/6 — Dev 立刻上报
```

---

## 红线

- **30 字内**,不发报告墙
- **不发敏感信息**(token / cookie / 路径 / 凭据)
- **失败必发**(老板要看)
- **进度 1/N ~ N/N 全发**,不跳
- **PROGRESS_ERROR 后子代理立刻停 + 上报**,不继续写代码

---

## 跟 live log 端口互备

| 渠道 | 用途 | 时延 |
|---|---|---|
| `sessions_send` → 主会话 → 飞书群 | 老板不在场也推 | 1-3 秒 |
| `agents-live.log` + `tools/agents-live.ps1` | 老板想自己看 | < 1 秒 |

两路并行,**任一失败不阻塞另一路**。

---

## 跟原 SOUL 红线的关系

本规则**不覆盖**"沉默不报"红线;只是**加一条透明度补丁**。
子代理仍要:
- 不写"我跑完了"(只写 Test-Path + Get-Content)
- 凭据禁明文(token mask 后 8 位)
- 失败 3 次立刻上报(不是 PROGRESS_ERROR 一次就停)
