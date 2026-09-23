# stripe-checkout — Stripe Checkout Session 生成器(纯本地 mock)

> **解决什么**:老板/子代理要生成 Stripe Checkout 链接(支付 / 订阅),不调真 Stripe、不联网、纯本地 mock。
> **给谁用**:OpenClaw dev agent + 需要生成 checkout 链接做测试的场景

## 3 步上手
1. 跑一发:`node skills/stripe-checkout/index.js --product "skill v1" --amount 2900 --currency usd`
2. 看产物:stdout 输出 `{checkout_url, session_id, status, mode, amount_cents, currency}`
3. **不要调真 Stripe**(老板海外推不了,反爬)

## 真实调用
输入(必传):
- `product_name`:商品 / 服务名
- `amount_cents`:金额(分,整数)

可选:
- `currency`:币种(默认 `usd`)
- `success_url`:成功回调 URL(默认 `https://example.com/success?session_id={CHECKOUT_SESSION_ID}`)
- `cancel_url`:取消回调 URL(默认 `https://example.com/cancel`)
- `quantity`:数量(默认 `1`)
- `mode`:`payment`(默认) / `subscription`

输出:
```
{
  checkout_url: "https://checkout.example.com/cs_test_xxx",
  session_id: "cs_test_xxx",
  status: "mock",
  mode: "payment",
  amount_cents: 2900,
  currency: "usd",
  product_name: "skill v1"
}
```

## 用法
```bash
# 默认 mock(无 STRIPE_SECRET_KEY)
node skills/stripe-checkout/index.js --product "skill v1" --amount 2900 --currency usd

# 订阅模式
node skills/stripe-checkout/index.js --product "Pro plan" --amount 1999 --currency usd --mode subscription

# 自定义回调 URL
node skills/stripe-checkout/index.js --product "ebook" --amount 999 --success-url "https://mysite.com/thanks" --cancel-url "https://mysite.com/oops"
```

## 限制说明
- **纯本地 mock,不联网、不调真 Stripe**(反爬 + 海外)
- mock 模式 `checkout_url` 格式:`https://checkout.example.com/cs_test_<id>`
- 配了 `STRIPE_SECRET_KEY` 也仅做**dry-run**(打印请求结构,不真发)
- 单价 = `amount_cents`,Stripe 推荐 ≥ 50 cents

## 红线
- **绝不调真 Stripe**(老板海外推不了 + 反爬)
- **绝不写明文 key** 到代码/日志/提交,只走 `$env:STRIPE_SECRET_KEY`
- 4xx/5xx 响应时返回 status="error",**不吞错**
- 金额 ≤ 0 / 非整数 → 立即报错

## 真话
- 本 skill 不递归 spawn,不调其他 skill
- 失败时 stderr 打印 `[FAIL] <reason>`,exit code 1
- 测试 `node skills/stripe-checkout/test.js` 不依赖任何凭据(mock 自动)

## 文件
- SKILL.md(本文)
- index.js(主程序 + CLI)
- test.js(自测)
