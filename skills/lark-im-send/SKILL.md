# lark-im-send — 飞书 IM 发消息(chat-agent 命脉)

> **解决什么**:老板/子代理要给飞书群/单聊发消息(汇报进度 / 卡片回复 / @提醒),不暴露 token,无凭据一律走 mock。
> **给谁用**:OpenClaw dev agent + 飞书群 Lead

## 3 步上手
1. 配凭据:`$env:FEISHU_BOT_TOKEN = "t-XXX"`(租户机器人 token,**不要写到代码里**)
2. 跑一发:`node skills/lark-im-send/index.js --chat "chat:oc_xxx" --message "hello"`
3. 看产物:拿到 `{message_id, status:'ok'|'mock', ts}`,没 token 时 status=mock

## 真实调用
输入(必传):
- `chat_id`:`oc_xxx`(群) / `ou_xxx`(单聊 @用户 open_id)
- `message`:文字 / 富文本 JSON 字符串

可选:
- `msg_type`:`text`(默认)/ `post` / `interactive`
- `receive_id_type`:`chat_id`(默认)/ `open_id` / `email`

输出:
```
{ message_id: 'om_xxx', status: 'ok', ts: 1728000000000 }
```
无 token 时:`{ message_id: 'mock_<random>', status: 'mock', ts: ... }`

## 用法
```bash
# 默认 mock(无 FEISHU_BOT_TOKEN)
node skills/lark-im-send/index.js --chat "chat:oc_xxx" --message "hello"

# 真发(配了 token)
$env:FEISHU_BOT_TOKEN = "t-xxxxx"
node skills/lark-im-send/index.js --chat "chat:oc_xxx" --message "hello"

# 富文本
node skills/lark-im-send/index.js --chat "oc_xxx" --message '{"zh_cn":{"title":"日报","content":[[{"tag":"text","text":"今日完成 3 项"}]]}}' --msg_type post
```

## 限制说明
- mock 模式不联网,只回 fake_id(sandbox/调试用)
- 真发走 `https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=chat_id`
- 限频:租户级 1000 次/分钟,本 skill **不内置限频**(调用方控制)
- 单条 ≤30KB,文字按 UTF-8 字节算

## 红线
- **绝不写明文 token** 到代码/日志/提交,只走 `$env:FEISHU_BOT_TOKEN`
- mock 模式不加 `--force` 不会真发
- 4xx/5xx 响应时返回 status='error',**不吞错**

## 真话
- 本 skill 不递归 spawn,不调其他 skill
- 失败时 stderr 打印 `[FAIL] <http_code> <body>`,exit code 1
- 测试 `node skills/lark-im-send/test.js` 不依赖任何凭据(mock 自动)

## 文件
- SKILL.md(本文)
- index.js(主程序 + CLI)
- test.js(自测)
