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

## 部署
老板自己 `npm start` 跑就行。零成本。
后续接 SerpAPI / Google CSE 升级搜索质量。
生产化时建议:加 Redis 缓存、加请求队列、加用户认证。

### Docker
```bash
docker build -t hallucination-checker .
docker run -p 3737:3737 -e SEARCH_PROVIDER=brave -e BRAVE_API_KEY=... hallucination-checker
```
Deploy overseas (Render/Railway/Fly.io) to avoid mainland China DNS hijack.

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
