---
name: lark-task-create
version: 1.0.0
created: 2026-09-23
agent: dev
---

# lark-task-create

飞书任务(Task v2)创建 skill。调飞书 OpenAPI /task/v2/tasks,无 token 走 mock。

## 入参
- 	itle (string, 必填):任务标题
- due (string, 可选 ISO):截止时间
- ssignee (string, 可选):被指派人 open_id
- list_id (string, 可选):任务列表 id

## 出参
- 	ask_id (string)
- url (string):任务详情链接
- status ('mock'|'created')

## 凭据
- process.env.FEISHU_BOT_TOKEN:无则 mock,绝不读明文

## 用法
bash
node skills/lark-task-create/index.js --title "做 X"
node skills/lark-task-create/index.js --title "X" --due "2026-10-01T10:00:00+08:00" --assignee "ou_abc"


## 红线
- 无 token 走 mock,绝不调真 API
- 不写明文 token
- title 必填,空值必报 REPORT_TO_BOSS

## test
node skills/lark-task-create/test.js → PASS
