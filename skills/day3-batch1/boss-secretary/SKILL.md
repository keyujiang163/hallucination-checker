# boss-secretary — 主动推送老板日报
> **解决什么**:老板在飞书群 @ 小灵后,小灵不再沉默过头 —— 主动汇报未读邮件数 / 待办数 / 子代理回报。
> **给谁用**:OpenClaw 用户 + 飞书群主 / 团队 Lead

## 3 步上手
1. 配飞书 webhook:$env:FEISHU_WEBHOOK = "https://open.feishu.cn/open-apis/bot/v2/hook/<your-hook>"
2. 跑一次看效果:node boss-secretary.js --check-now
3. 配每天 9:00 / 18:00 定时喊:Schtasks /Create /SC DAILY /TN "boss-secretary" /TR "node boss-secretary.js"

## 真实案例
输入:node boss-secretary.js --check-now
输出(飞书群消息):
  📊 老板日报 2026-09-23 09:00
  • 检查调用:1 次
  • 待办任务:3 件
  • 未读邮件:0 封

## 限制说明
- 不读邮件内容(只查未读数,需配 IMAP)
- 飞书 webhook 必须在 $env:FEISHU_WEBHOOK
- node ≥14,Windows / Mac / Linux 全平台

## 文件
- SKILL.md(本文)
- boss-secretary.js(主程序)
- test.js(自测脚本)
