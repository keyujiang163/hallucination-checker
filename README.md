# Hallucination Checker (AI 防幻觉核查工具)

把 AI 的回答贴进来 → 自动拆事实点 → 公开搜索 API 联网核查 → 出红绿报告。
绿色 = 有证据 / 红色 = 无证据 / 灰色 = 未知(核查失败)。

## 技术栈
- 后端:Node.js + Express
- 前端:原生 HTML + JS(不引框架,2 周 demo 够用)
- LLM:api.minimax.chat/v1/text/chatcompletion_v2(MiniMax-M3)
- 搜索:DuckDuckGo Instant Answer(零成本零 key,后续接 SerpAPI)
- 存储:JSON 文件存 demo 案例(无数据库)

## 怎么跑

### 1. 安装依赖
```
cd D:\projects\ai-hallucination-checker
npm install
```

### 2. 配置环境变量(可选)
新建 `.env` 文件,内容:
```
PORT=3737
MINIMAX_API_KEY=你的_key
LLM_MODEL=MiniMax-M3
```
没配 key 也能跑,LLM 调用可能失败但搜索层照常工作。

### 3. 启动
```
npm start
```
访问 http://localhost:3737

## Limitations

### Network access
- **Mainland China users**: `api.duckduckgo.com` is DNS-hijacked to Facebook/Twitter IPs by the GFW. The default DDG provider will hang/fail with `connect ETIMEDOUT` errors even with 30s timeout + retry.
- **Fix options**: (a) deploy overseas (AWS Tokyo, Vercel, Render free tier), (b) configure system HTTPS proxy, (c) switch to a paid provider (Brave / Tavily) that has reachable IPs.
- Wikipedia API has the same issue; this build intentionally disables it.

### LLM
- Default splitter is rule-based (sentence boundaries + stopword filter). LLM splitting requires `LLM_API_KEY` with quota.
- Current test env reports `base_resp: 2049` from MiniMax — likely quota exhausted. Use a paid MiniMax tier or switch `LLM_MODEL` to another OpenAI-compatible provider.

## API

### GET /api/health
返回 `{ok: true}` 健康检查。

### POST /api/check
请求:`{"text": "AI 回答内容"}`
返回:`{"results": [{"claim":"...","status":"verified|unverified|unknown","evidence":"..."}]}`

## 核心闭环
1. 用户输入 AI 回答
2. 调 LLM 拆事实点(强约束:JSON 数组,每条 < 30 字,最多 5 条)
3. 每个事实点用 DuckDuckGo Instant Answer 查
4. 出红绿报告

## 限流与边界
- DuckDuckGo 限流:每请求间隔 2 秒,每次最多 5 个事实点
- 单次请求最长 ~12 秒(2s × 5)
- LLM 拆不出事实点时返回空数组

## Deploy

### 一键部署包(给大陆用户)

桌面预打包:`C:\Users\Administrator\Desktop\hallucination-checker.zip`(~30KB)
- 包含 14 个公开文件,已剔除 `.env / hc_key.txt / *.log / 测试样本 / node_modules`
- 解压后整个拖进 GitHub 上传区,或直接拖 Cloudflare Pages 后台

### 上传到 GitHub(无需 push 也不需命令行)

1. 解压 zip 到桌面 → 得到 `hallucination-checker\` 文件夹
2. 浏览器打开 https://github.com/keyujiang163/hallucination-checker
3. 点 **Add file** → **Upload files** → 把整个文件夹拖进去 → Commit
4. 推送时**只选 commit,不要勾选 replace existing files**

### 上传到 Cloudflare Pages(更快,zip 直接拖)

1. 注册 https://dash.cloudflare.com/(有中文)
2. Pages → Upload assets → 拖 zip → 自动识别 Dockerfile → Deploy
3. 等 2-3 分钟,得到 `https://hc-xxx.pages.dev`

### 海外平台一键 deploy 完整文档

See [DEPLOY.md](./DEPLOY.md) for step-by-step instructions (Render / Fly.io / Local Docker).

- Render Blueprint 2.0: `render.yaml` 已配置,push 后关自动部署
- Stripe Webhook 配置见 DEPLOY.md
- 环境变量 `sync: false` 的 key 需在 Dashboard 手动填

## 海外售后(大陆老板专版)

**核心结论:你不需要跟海外客服讲一句话**——所有用到的平台都有中文后台:

| 故障 | 你的操作 | 自动化 / 后台代劳 |
|---|---|---|
| **服务挂了** | **0 步** —— Render 自动重启 | UptimeRobot 监控(免费),挂 5 分钟自动喊 |
| **代码 bug** | 飞书群说一声 → Dev 子代理改 | git push → Render auto-deploy |
| **支付失败 / 退款** | Stripe Dashboard 中文,一键退款 | Stripe 后台 |
| **客户提问** | README FAQ + `hi@hc.xx` 邮箱 | 客户自助 |
| **账单 / 订阅纠纷** | Stripe Dashboard 中文 | Stripe |
| **大故障 / 数据丢失** | **0 步** —— 本地 git 完整 | 任何机器 `git clone` 拉走 |

### 监控告警(免费)

- [UptimeRobot](https://uptimerobot.com/) 注册 → 5 分钟间隔 GET `/api/health`
- 挂掉自动邮件 / Telegram / Discord 通知
- 设置一次,永久运行

### Stripe / Render / Cloudflare 中文后台

- Stripe: https://dashboard.stripe.com/(付款、退款、订阅、Webhook 全中文)
- Render: https://dashboard.render.com/(日志、重启、env 全中文)
- Cloudflare: https://dash.cloudflare.com/(域名、DNS、Pages 全中文)
- GitHub: https://github.com/(中文,文件编辑直接网页操作)

### 自助 debug 三板斧

```powershell
# 1. 看本地服务状态
curl http://localhost:3737/api/health

# 2. 看 Render 日志
Render Dashboard → hallucination-checker → Logs → 实时

# 3. 重启服务
Render Dashboard → Manual Deploy → "Deploy latest commit"
```

## 变现点 (B 端 SaaS 299 元/月)

### 目标行业 4 选
1. **医疗** — 医生/医院咨询 AI 答患者后做合规核查(高付费意愿)
2. **法律** — 律所 AI 答法律问题后的引用真实性核查
3. **客服** — 电商 AI 客服话术核查(避免乱承诺)
4. **教育** — 教育 AI 出题后的事实核查(避免教错学生)

### 切入路径
- 先做免费工具引流(已有 http 接口)
- 接 Slack / 飞书 / 企微 bot,做企业内嵌
- 大客户(医院/律所)按席位 299/月,定制行业知识库再 +500

### 竞争壁垒
- 中文场景 DuckDuckGo + 国产 LLM 链路打通
- 行业知识库沉淀(医疗药品库/法规库)→ 用户切走成本高

## Roadmap
- [ ] 接 SerpAPI 提升搜索质量
- [ ] 加引用 URL 溯源(直接给可点证据链接)
- [ ] 飞书 / 企微 bot
- [ ] 多语言(英文/日文)
- [ ] 用户系统 + 计费

## License
MIT © 2026 keyujiang163

## Adding a search provider

Edit `searchProviders.js`:
1. Implement `async function searchXxx(claim)` returning `{hasEvidence, evidence}` (throw on unrecoverable error).
2. Add to dispatch map in `searchWithProvider`.
3. Update `.env.example` with new key (if needed).
4. Restart server.

Total ~5 lines per provider. See `searchDDG` for the canonical retry + timeout pattern.
