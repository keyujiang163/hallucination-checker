# lark-calendar-create — 飞书日程创建(mock + openapi 双模)

> **解决什么**:OpenClaw 子代理要往老板飞书日历塞日程(开会/汇报/排期),无 token 时一律 mock,绝不真发。
> **给谁用**:dev agent + 飞书日历 owner

## 3 步上手
1. 配凭据:`$env:FEISHU_BOT_TOKEN = "t-XXX"`(租户机器人 token,**不写到代码里**)
2. 跑一发:`node skills/lark-calendar-create/index.js --summary "周会" --start "2026-09-25T10:00" --end "2026-09-25T11:00"`
3. 看产物:返回 `{event_id, url, status, mode}`,无 token 时 `status=mock`

## 真实调用
输入(必传):
- `summary`:日程标题
- `start_time`:ISO 时间(本地时区也行,内部 parse)
- `end_time`:ISO 时间
- `calendar_id`:可选,默认 `primary`(主日历 OpenAPI 路径会拼 `/calendars/:calendar_id/events`)

可选:
- `attendees`:数组(open_id / email)
- `description`:文本
- `force`:真发开关(默认 mock / 干跑)

输出:
```
{
  event_id: 'mock_xxxx' | 'feishu_evt_xxxx',
  url: 'https://calendar.feishu.cn/calendar/xxxx',
  status: 'mock' | 'ok',
  mode: 'no_token' | 'live'
}
```

## Mock 行为
- 无 `FEISHU_BOT_TOKEN` → 直接返回 `mock_xxxx`,不发请求
- 有 token + `force != true` → 构造请求体,**不发**,控制台打印 `dry-run`
- 有 token + `force = true` → 真调 `/open-apis/calendar/v4/calendars/:calendar_id/events`

## 用法
```bash
# 默认 mock(无 FEISHU_BOT_TOKEN)
node skills/lark-calendar-create/index.js --summary "周会" --start "2026-09-25T10:00" --end "2026-09-25T11:00"

# 带参会人 + 描述
node skills/lark-calendar-create/index.js \
  --summary "产品评审" \
  --start "2026-09-25T14:00" --end "2026-09-25T15:30" \
  --attendees "ou_aaa,ou_bbb" \
  --description "评审 v2.1"

# 真发(慎重)
$env:FEISHU_BOT_TOKEN="t-xxx"; node skills/lark-calendar-create/index.js --summary "x" --start "2026-09-25T10:00" --end "2026-09-25T11:00" --force
```

## 红线
- token 必走 `process.env.FEISHU_BOT_TOKEN`,代码无明文
- 不写明文 attendee open_id 到 git
- 4xx/5xx 不吞错,原样 `REPORT_TO_BOSS: ...` 上抛
- mock 状态要在返回值里显式标 `status:"mock"`,不让上层误判为成功
- 文件 ≤ 200 行

## 关联
- `/calendar/v4/calendars/:calendar_id/events` POST
- 飞书 OpenAPI 文档:https://open.feishu.cn/document/server-docs/docs/calendar-v4/calendar-event/create
