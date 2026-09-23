// test.js — lark-calendar-create 自测(mock + dry-run,无 token,纯本地)
// 测:1)mock 返回 fake_id  2)必填校验  3)有时间校验  4)dry-run 不发  5)cli 跑通

'use strict';
const assert = require('assert');
const { createEvent } = require('./index');

(async () => {
  // 1) mock 模式(无 FEISHU_BOT_TOKEN)
  delete process.env.FEISHU_BOT_TOKEN;
  const m = await createEvent({
    summary: '周会',
    start_time: '2026-09-25T10:00',
    end_time: '2026-09-25T11:00',
  });
  assert.strictEqual(m.status, 'mock');
  assert.strictEqual(m.mode, 'no_token');
  assert.ok(/^mock_[a-z0-9]+$/.test(m.event_id), 'mock id shape: ' + m.event_id);
  assert.ok(m.url.startsWith('https://calendar.feishu.cn/'));

  // 2) summary 必填
  await assert.rejects(() => createEvent({ start_time: '2026-09-25T10:00', end_time: '2026-09-25T11:00' }), /summary required/);

  // 3) 时间必填
  await assert.rejects(() => createEvent({ summary: 'x', end_time: '2026-09-25T11:00' }), /start_time and end_time required/);

  // 4) dry-run 模式(有 token 但无 force)
  process.env.FEISHU_BOT_TOKEN = 't_test_dummy';
  const d = await createEvent({
    summary: '评审',
    start_time: '2026-09-25T10:00',
    end_time: '2026-09-25T11:00',
    attendees: ['ou_aaa', 'ou_bbb'],
  });
  assert.strictEqual(d.status, 'dry-run');
  assert.strictEqual(d.mode, 'live');

  // 5) CLI 跑通(node index.js --summary 周会 ...)
  const { execFileSync } = require('child_process');
  const path = require('path');
  delete process.env.FEISHU_BOT_TOKEN;
  const out = execFileSync(process.execPath, [
    path.join(__dirname, 'index.js'), '--summary', 'CLI测试', '--start', '2026-09-25T10:00', '--end', '2026-09-25T11:00',
  ], { encoding: 'utf8' }).trim();
  const cli = JSON.parse(out);
  assert.strictEqual(cli.status, 'mock');
  assert.ok(cli.event_id);

  console.log('OK lark-calendar-create (mock + dry-run + validate + cli)');
})().catch((e) => { console.error('[FAIL]', e.message); process.exit(1); });
