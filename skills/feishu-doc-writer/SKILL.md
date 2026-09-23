---
name: feishu-doc-writer
version: 1.0.0
created: 2026-09-23
agent: dev
---

# feishu-doc-writer

飞书 Docx 创建 + 写内容。POST /docx/v1/documents 建文档,然后 POST /docx/v1/documents/:token/blocks 写文本。无 token 走 mock。

## 入参
- 	itle (string, 必填):文档标题
- content (string, 必填):正文(单段)
- parent_token (string, 可选):父目录

## 出参
- doc_token (string)
- url (string):飞书 doc URL
- status ('mock'|'created')

## 凭据
- process.env.FEISHU_BOT_TOKEN,无则 mock

## 用法
bash
node skills/feishu-doc-writer/index.js --title "X" --content "正文"
node skills/feishu-doc-writer/index.js --title "A" --content "B" --parent_token "fldcnXXX"


## 红线
- title/content 必填,空必报
- 无 token 走 mock,绝不调真 API
- ALLOW_LIVE=1 才允许真发,否则 dry-run

## test
node skills/feishu-doc-writer/test.js → PASS
