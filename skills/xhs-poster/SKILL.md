# xhs-poster — 小红书发布器(变现链路)

> **解决什么**:子代理要写小红书笔记(变现),绝不真发(反爬严),只走 mock + 调度接口,把候选记录落到 `memory/YYYY-MM-DD-posts.md`。
> **给谁用**:OpenClaw dev agent + marketing-ops 主程序

## 3 步上手
1. 跑一发:`node skills/xhs-poster/index.js --title "AI skill 落地" --tags "AI,skill" --time-slot morning`
2. 看 stdout:`{ post_id, status: 'mock'|'queued', queue_file }`
3. 看落盘:`memory/YYYY-MM-DD-posts.md` 已追加

## 输入
- `title`(必):笔记标题
- `body`(可选):正文(默认从 opts.body 或写 placeholder)
- `tags`(必):逗号分隔的 tag 列表
- `time_slot`(可选):`morning`(7:00-12:00)/ `evening`(18:00-23:00)/ `none`(旁路红)

## 输出
```
{
  post_id: 'mock_<随机串>',
  status: 'mock' | 'queued',
  queue_file: 'memory/2026-09-23-posts.md',
  note_idx: 1
}
```

## 用法
```bash
node skills/xhs-poster/index.js --title "AI skill 落地" --tags "AI,skill" --time-slot morning

# 不带 time-slot(默认 morning)
node skills/xhs-poster/index.js --title "..." --tags "..."
```

## 实现
1. 必填校验(title / tags)→ 不通过抛错
2. 调 `tools/marketing-ops/auto-poster.js` 的 `postNote({time_slot, day})` 接口
3. 自动追加一行到 `<ROOT>/memory/YYYY-MM-DD-posts.md`
4. **绝不调 XHS 真实 API**

## 红线
- **绝不真发小红书**(反爬严,本 skill 全程 mock)
- 不设 `XHS_COOKIE` 也不会触发真发(marketing-ops 自动 dry-run)
- 不安装新 npm 包(只用 fs/path)
- 不递归 spawn

## 真话
- 测试用 `memory/` 临时目录隔离(不改真 memory)
- 失败时 stderr 打印 `[FAIL] <reason>`,exit 1
- marketing-ops 抛 `REPORT_TO_BOSS` 错误时透传

## 文件
- SKILL.md(本文)
- index.js(主程序 + CLI)
- test.js(自测)
