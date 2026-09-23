# lark-approval-handle — 飞书审批实例处理(chat-agent 命脉)

> **解决什么**:老板/子代理要批量处理飞书审批实例(approve / reject / forward),不暴露 token,无凭据一律走 mock。
> **给谁用**:OpenClaw dev agent + 需要审批流自动化的场景

## 3 步上手
1. 配凭据:`$env:FEISHU_BOT_TOKEN = "t-XXX"`(租户机器人 token,**不要写到代码里**)
2. 跑一发:`node skills/lark-approval-handle/index.js --instance "ins_xxx" --action approve`
3. 看产物:拿到 `{approval_id, status, ts}`,无 token 时 status=mock

## 真实调用
输入(必传):
- `instance_id`:审批实例 ID(如 `ins_ABC123`)
- `action`:`approve` / `reject` / `forward`

可选:
- `comment`:审批意见
- `approver`:转发目标用户 open_id(action=forward 时必填)

输出:
```
{ approval_id: "ap_xxx", status: "ok", ts: 1728000000000 }
```
无 token 时:`{ approval_id: "mock_<random>", status: "mock", ts: ... }`

## 用法
```bash
# 默认 mock(无 FEISHU_BOT_TOKEN)
node skills/lark-approval-handle/index.js --instance "ins_ABC123" --action approve

# 驳回 + 备注
node skills/lark-approval-handle/index.js --instance "ins_ABC123" --action reject --comment "材料不齐"

# 转发
node skills/lark-approval-handle/index.js --instance "ins_ABC123" --action forward --approver "ou_xxx"

# 真发(配了 token + --force)
$env:FEISHU_BOT_TOKEN = "t-xxxxx"
node skills/lark-approval-handle/index.js --instance "ins_ABC123" --action approve --force
```

## 限制说明
- mock 模式不联网,只回 fake_id(sandbox/调试用)
- 真发走 `https://open.feishu.cn/open-apis/approval/v4/instances/:instance_id/approve`
- action 仅限 `approve` / `reject` / `forward`
- forward 必须提供 `approver`(open_id)

## 红线
- **绝不写明文 token** 到代码/日志/提交,只走 `$env:FEISHU_BOT_TOKEN`
- mock 模式不加 `--force` 不会真发
- 4xx/5xx 响应时返回 status="error",**不吞错**
- 非法 action / 缺 instance_id → 立即报错

## 真话
- 本 skill 不递归 spawn,不调其他 skill
- 失败时 stderr 打印 `[FAIL] <http_code> <body>`,exit code 1
- 测试 `node skills/lark-approval-handle/test.js` 不依赖任何凭据(mock 自动)

## 文件
- SKILL.md(本文)
- index.js(主程序 + CLI)
- test.js(自测)
