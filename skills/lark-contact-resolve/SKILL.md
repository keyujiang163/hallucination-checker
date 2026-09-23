---
name: lark-contact-resolve
version: 1.0.0
created: 2026-09-23
agent: dev
---

# lark-contact-resolve

飞书联系人解析:姓名 / 邮箱 → open_id。调 /contact/v3/users,无 token 走 mock。

## 入参
- 
ame | email(二选一)
- 	ype?:'name' | 'email'(默认根据 key 名猜)

## 出参
- open_id (string)
- 
ame (string)
- email (string|null)
- status ('mock'|'resolved')

## 凭据
- process.env.FEISHU_BOT_TOKEN,无则 mock

## 用法
bash
node skills/lark-contact-resolve/index.js --name "老板"
node skills/lark-contact-resolve/index.js --email "[email protected]"


## 红线
- 必传 name 或 email,空必报
- mock 模式 fake_open_id,绝不调真 API

## test
node skills/lark-contact-resolve/test.js → PASS
