# Hallucination Checker 部署指南

> 部署到海外(绕大陆 DNS 污染)，零成本起步。

---

## 目录
- [Render（推荐）](#render推荐)
- [Fly.io（备选）](#flyio备选)
- [本地 Docker](#本地-docker)
- [Stripe Webhook 配置](#stripe-webhook-配置)
- [环境变量清单](#环境变量清单)

---

## Render（推荐）

Render Blueprint 2.0 支持 `render.yaml`，一条 yml 搞定所有服务定义。

### 第一步：注册 Render
1. 访问 https://dashboard.render.com/
2. 用 **GitHub OAuth** 登录（免费，无需信用卡）
3. New → Blueprint → 选择 `hallucination-checker` 仓库

### 第二步：确认 Blueprint
Render 自动读取仓库根目录的 `render.yaml`，会预览：
- Service: `hallucination-checker`（Docker runtime, free plan, Oregon）
- 环境变量全部列好，其中 `sync: false` 的需要手动填

### 第三步：填密钥
在 Render Dashboard → Environment，找到以下 key，逐个手动填入：
- `BRAVE_API_KEY`（Brave Search API，https://api.search.brave.com/）
- `ANTHROPIC_API_KEY`（Claude API，https://console.anthropic.com/）
- `STRIPE_SECRET`（Stripe 密钥，https://dashboard.stripe.com/apikeys）
- `STRIPE_WEBHOOK_SECRET`（部署后从 Stripe Webhooks 页面复制，见下方说明）

> `sync: false` 意味着这些 key 不会从本地 .env 同步，必须在 Dashboard 填。

### 第四步：部署
1. 点击 Create Blueprint → 等 Build（2-3 分钟）
2. 打开 Logs 面板，确认输出 `listening on 3737`
3. 访问 https://hallucination-checker.onrender.com/api/health → 期望 `{"ok":true}`

### 第五步：配置 Stripe Webhook
1. Stripe Dashboard → Developers → Webhooks → Add endpoint
2. Endpoint URL: `https://hallucination-checker.onrender.com/api/webhook/stripe`
3. Select events: `checkout.session.completed`、`customer.subscription.updated`、`customer.subscription.deleted`
4. 复制 Signing secret → 填入 Render Dashboard 的 `STRIPE_WEBHOOK_SECRET`

---

## Fly.io（备选）

Fly.io 免费层比 Render 宽松，适合长期免费跑。

### 部署步骤
```bash
# 1. 安装 flyctl（Windows: 下载 .exe）
fly auth signup

# 2. 在项目目录运行（自动读取 Dockerfile）
cd D:\projects\ai-hallucination-checker
fly launch --no-deploy

# 3. 设置密钥
fly secrets set BRAVE_API_KEY=你的_key
fly secrets set ANTHROPIC_API_KEY=你的_key
fly secrets set STRIPE_SECRET=sk_live_xxx
fly secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx

# 4. 部署
fly deploy
```

访问 `fly logs` 确认启动成功。

---

## 本地 Docker

```bash
cd D:\projects\ai-hallucination-checker

# 构建镜像
docker build -t hc .

# 运行（需要 .env 文件或 -e 参数传密钥）
docker run -p 3737:3737 --env-file .env hc

# 或手动指定环境变量
docker run -p 3737:3737 \
  -e SEARCH_PROVIDER=brave \
  -e BRAVE_API_KEY=xxx \
  -e LLM_PROVIDER=anthropic \
  -e ANTHROPIC_API_KEY=yyy \
  hc
```

验证：`curl http://localhost:3737/api/health`

---

## Stripe Webhook 配置

> 支付和订阅管理依赖 Stripe Webhook。每次订阅事件必须通过 Stripe 签名验证。

### 添加 Webhook Endpoint
1. https://dashboard.stripe.com/webhooks
2. Add endpoint：
   - URL: `https://<your-domain>/api/webhook/stripe`
   - Events: `checkout.session.completed`、`customer.subscription.updated`、`customer.subscription.deleted`
3. 复制 Signing secret → 填入部署平台的 `STRIPE_WEBHOOK_SECRET`

### 本地测试 Stripe Webhook
```bash
# 下载 stripe CLI
stripe listen --forward-to localhost:3737/api/webhook/stripe
# 输出 webhook signing secret，复制到 .env STRIPE_WEBHOOK_SECRET
```

---

## 环境变量清单

| Key | 说明 | 必填 | sync |
|-----|------|------|------|
| `NODE_ENV` | `production` | ✅ | ✅ |
| `PORT` | `3737` | ✅ | ✅ |
| `SEARCH_PROVIDER` | `brave` / `ddg` | ✅ | ✅ |
| `BRAVE_API_KEY` | Brave Search API Key | ✅（用 Brave 时）| ❌ |
| `LLM_PROVIDER` | `anthropic` | ✅ | ✅ |
| `ANTHROPIC_API_KEY` | Anthropic API Key | ✅（用 Claude 时）| ❌ |
| `STRIPE_SECRET` | Stripe Secret Key | ✅（变现时）| ❌ |
| `STRIPE_WEBHOOK_SECRET` | Stripe Webhook Signing Secret | ✅（变现时）| ❌ |
| `SITE_URL` | 站点根 URL | ✅ | ✅ |

> `sync: false` 的变量只读 Render/Fly Dashboard，不从本地 .env 同步。

---

## 常见问题

**Q: Build 失败，显示 `npm ERR`**  
→ 检查 package.json 和 package-lock.json 是否在仓库根目录，HEALTHCHECK 要求 Alpine 镜像有 `wget`。

**Q: Health check 一直失败**  
→ 确认 `healthCheckPath: /api/health` 在 render.yaml，镜像 EXPOSE 3737，CMD 是 `node server.js`。

**Q: Brave Search 返回空结果**  
→ 确认 BRAVE_API_KEY 有效（https://api.search.brave.com/ 免费 tier 每月 2000 次）。

**Q: 订阅 webhook 收不到**  
→ Stripe Dashboard → Webhooks → 查看最近 events 日志，确认 endpoint 激活。
