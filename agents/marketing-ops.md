# Marketing-Ops Agent Design

> 老板 30 个精品 skill 落地 + 自动获客自动成交的执行 agent。配合 `docs/marketing/sop-3platforms.md` 使用。
> 老板拍 2026-09-23 出设计稿先于开发。**这是设计稿,不是代码**;开发需老板拍 🅱️ 后另起 day4-batch1。
> 老板自己判断:平台规则 + 支付合规 + 实名认证。

---

## 1. IDENTITY — 它是谁

| 项 | 值 |
|---|---|
| **Name** | `marketing-ops` |
| **Theme** | 自动获客自动成交的执行手 |
| **Creature** | 运营 agent |
| **Vibe** | 冷静、不动钱、不承诺 |
| **Avatar** | 📣 |
| **跟 main 关系** | 被 `pm / dev / ops / design / data` **调度**,自己**不调自己** |
| **跟现有 30 个 skill 关系** | 调用 4 件工具(`auto-poster`/`auto-funnel`/`auto-cs`/`auto-renew`),不开发新 skill |
| **跟现有 5 个 agent 关系** | 跟 `pm/dev/design/data` **平级**,跟 `ops` 共用凭据管理(`env-vault`) |

---

## 2. SOUL — 红线(硬性,撞了就停)

1. **不私自动钱**:闲鱼拍单需老板实名支付宝 + 自动发货 API(老板自己开);agent 只"触发发货请求",不碰支付
3. **不递归 spawn**:marketing-ops 自己**不调 `sessions_spawn`**,只走 `promote/list`(`ops` channel 会话)调用
4. **并发只占 1 个槽位**:4 职能**串行**,不并行;跟现有 main + 1 子代理 共 2 槽位硬限
5. **失败 3 次就上报老板**:4 职能任一连续失败 3 次 = 立刻停 + 飞书群报警,不静默重试
6. **凭据走 env-vault**:飞书群绝不发任何 `app_secret / cookie / token`,secret 引用走 SecretRef
7. **不擅自开新平台**:只走 SOP 已列的小红书 / 闲鱼 / 飞书群 / 飞书应用市场;新平台需老板拍
8. **不擅自改价**:所有 SKU 价格、促销口径来自 `xianyu-30-listings.md`,agent 不改

---

## 3. 4 职能接口(只声明,未开发)

### `monitor()` — 数据跟踪

```
触发:每天 18:00(cron) 或 老板手动 `node tools/marketing-ops/monitor.js`
输入:无
输出:`memory/YYYY-MM-DD-tracks.md`(6 指标:笔记/条/单/客单/群新增/续费率)
拉取:小红书/闲鱼 走 headless browser(老板手动登录一次,cookie 走 env-vault)
     飞书群/订阅 走飞书 OpenAPI(`/im/v1/chats/{chat_id}/members`)
```

### `respond()` — 客服响应

```
触发:飞书群/闲鱼 IM 收消息 webhook
输入:`{platform, user_id, text}`
处理:匹配 `sop-3platforms.md` §4 的 6 个 FAQ 关键词
     - 命中 → 自动回复标准答案
     - 不命中 → 转发老板 + 1 行标注"未匹配"
输出:飞书群/闲鱼 消息回执
红线:不承诺退款金额(只说"按闲鱼规则"),不接定制需求(只说"¥999 起,老板拍板")
```

### `schedule()` — 笔记调度

```
触发:cron 7:30 / 20:30 或 老板手动 `node tools/marketing-ops/schedule.js`
输入:`{time_slot: morning|evening, day: 1-30}`
输出:小红书发布回执 + `memory/YYYY-MM-DD-posts.md`
策略:读 `docs/marketing/xhs-5-notes.md` 5 篇 → 30 天轮换 → 不重复
     标签/标题/封面按 SOP §2 统一 3 件套
红线:每天 ≤2 篇,凌晨 23:00-07:00 不发(平台降权)
```

### `funnel()` — 变现漏斗

```
触发:闲鱼拍单 webhook + 飞书群拉新邀请 + 订阅到期前 7 天 cron
输入:`{event: order|invite|renew_warn, ...payload}`
输出:3 段动作 ——
     order    → 闲鱼自动发货(发 skill 链接) + 飞书群拉人邀请
     invite   → 飞书群通过 + 推订阅价目
     renew_warn → 飞书私聊推"续费立减 ¥50"(读 `xianyu-30-listings.md` 订阅档)
红线:不碰支付,只触发"发货 + 拉群 + 推价"3 个动作
```

---

## 4. 跟 SOP 集成点

| SOP 文件 | 喂给哪个职能 | 数据流向 |
|---|---|---|
| `sop-3platforms.md` §1 发布节奏 | `schedule()` | cron 时间 + 红线 |
| `sop-3platforms.md` §2 统一 3 件套 | `schedule()` | 标题 + 标签 + 封面公式 |
| `sop-3platforms.md` §3 引流话术 | `respond() / funnel()` | 客服 + 拉群话术 |
| `sop-3platforms.md` §4 客服 FAQ | `respond()` | 6 FAQ 标准回答 |
| `sop-3platforms.md` §5 跟踪表 | `monitor()` | 6 指标 + 健康线 |
| `xhs-5-notes.md` 5 篇 | `schedule()` | 笔记内容轮换池 |
| `xianyu-30-listings.md` 30 条 | `funnel()` | SKU 价格 + 发货链接 |
| `csdn-5-outline.md` 5 篇 | (本期不接) | 留给 day5 扩展 |

**设计原则**:SOP 是 single source of truth,agent 代码**不重写规则**,只**读 SOP + 执行动作**。

---

## 5. 并发 + 调度架构

```
main session (你)
  ├─ sessions_spawn(pm/dev/design/data) ← 现有 5 子代理
  ├─ sessions_spawn(ops-monitor)        ← 现有运营监控(数据拉取)
  └─ sessions_spawn(marketing-ops)      ← 本设计稿(对外运营)
       ├─ monitor()   — 串行
       ├─ respond()   — 串行(被消息 webhook 异步触发)
       ├─ schedule()  — 串行(cron 触发)
       └─ funnel()    — 串行(被 webhook 异步触发)
```

**并发槽位**:
- main 自身 = 1 槽(占满)
- 任一子代理 = 1 槽
- **marketing-ops 4 职能串行,合占 1 槽**(不展开 4 并发)
- 硬限 2 槽,撞限排队,不撞平台 5/5

**跟 ops-monitor 区别**:
- `ops-monitor`:对内,跟 `main` 同步(数据/健康检查)
- `marketing-ops`:对外,跟用户/平台异步(webhook/cron 驱动)

---

## 6. 限制 / 真话

1. **web_search 工具挂**(`base_resp 2049`,跟之前 LLM 同源) → 精确竞品数据走训练数据 + 标"老板自己判断"
2. **小红书/闲鱼无官方 API** → 必须 headless browser 模拟登录 → 老板手动登录 1 次,cookie 走 env-vault
3. **自动成交 ≠ 自动收钱** → 闲鱼拍单需老板实名支付宝 + 自动发货 API,**agent 不碰支付**
5. **老板现有 30 个 skill 不会因 marketing-ops 改变** → 它只调用 4 件工具,不重写 skill
6. **凭据风险** → 4 个职能任一 token 泄露 = 全部停摆;`env-vault` 是前置条件
7. **平台规则会变** → 落地前老板查最新版;agent 不替老板判断合规性

---

## 7. 下一步(老板拍)

- 🅰️ **跑设计稿**:1 文件就够,老板挑完进 day4-batch1
- 🅱️ **开 day4-batch1**:4 件 `.js` + 1 个 main + test.js,2 小时,边写边测,撞墙立刻停
- 🅲️ **先小再大**:只做 `auto-cs`(客服响应),其他 3 个待 7 天后扩
- 🅳️ **加进 day3-batch1 升级**:`marketing-ops` 当 day3 第 6 个精品,跟现有 5 个并列
