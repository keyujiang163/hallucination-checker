# lark-mail-send — 飞书邮箱发邮件(chat-agent 命脉)

> **解决什么**:老板/子代理要给指定邮箱发邮件(汇报 / 通知 / 抄送),不暴露 token,无凭据一律走 mock。
> **给谁用**:OpenClaw dev agent + 需要邮件触达的场景

## 3 步上手
1. 配凭据:`$env:FEISHU_BOT_TOKEN = "t-XXX"`(租户机器人 token,**不要写到代码里**)
2. 跑一发:`node skills/lark-mail-send/index.js --to "alice@example.com" --subject "hi" --body "..."`
3. 看产物:拿到 `{message_id, status:"ok"|"mock"}`,无 token 时 status=mock

## 真实调用
输入(必传):
- `to`:收件人邮箱(支持逗号分隔多收件人)
- `subject`:主题
- `body`:正文(text 或 html)

可选:
- `cc`:抄送邮箱(逗号分隔)
- `bcc`:密送邮箱(逗号分隔)
- `is_html`:`true` / `false`(默认 false,纯文本)

输出:
```
{ message_id: "msg_xxx", status: "ok" }
```
无 token 时:`{ message_id: "mock_<random>", status: "mock" }`

## 用法
```bash
# 默认 mock(无 FEISHU_BOT_TOKEN)
node skills/lark-mail-send/index.js --to "alice@example.com" --subject "hi" --body "hello"

# 真发(配了 token)
$env:FEISHU_BOT_TOKEN = "t-xxxxx"
node skills/lark-mail-send/index.js --to "alice@example.com" --subject "hi" --body "..."

# HTML + 抄送
node skills/lark-mail-send/index.js --to "alice@example.com" --cc "bob@example.org" --subject "demo" --body "<h1>hi</h1>" --is_html true
```

## 限制说明
- mock 模式不联网,只回 fake_id(sandbox/调试用)
- 真发走 `https://open.feishu.cn/open-apis/mail/v1/user_mailboxes/me/messages`
- 单封邮件 body ≤5MB(飞书 OpenAPI 限制)
- 邮箱地址需符合 RFC 5322

## 红线
- **绝不写明文 token** 到代码/日志/提交,只走 `$env:FEISHU_BOT_TOKEN`
- mock 模式不加 `--force` 不会真发
- 4xx/5xx 响应时返回 status="error",**不吞错**
- 邮箱格式不合法 → 立即报错,不静默发送

## 真话
- 本 skill 不递归 spawn,不调其他 skill
- 失败时 stderr 打印 `[FAIL] <http_code> <body>`,exit code 1
- 测试 `node skills/lark-mail-send/test.js` 不依赖任何凭据(mock 自动)

## 文件
- SKILL.md(本文)
- index.js(主程序 + CLI)
- test.js(自测)
