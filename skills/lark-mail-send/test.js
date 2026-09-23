// test.js — lark-mail-send 自测(mock 模式,不联网)
// 测:1)mock 返回 fake_id 2)空字段抛错 3)邮箱格式校验 4)cli 跑通

'use strict';
const assert = require('assert');
const path = require('path');
const { send } = require('./index');

const E1 = 'alice@example.com';
const E2 = 'bob@example.org';
const BAD = 'not-an-email';
const HERE = __dirname;

(async () => {
  // 1) mock 模式(无 FEISHU_BOT_TOKEN)
  delete process.env.FEISHU_BOT_TOKEN;
  const m = await send({ to: E1, subject: 'hi', body: 'hello' });
  assert.strictEqual(m.status, 'mock');
  assert.ok(/^mock_msg_[a-z0-9]+$/.test(m.message_id), 'mock id shape: ' + m.message_id);

  // 2) to 必填
  await assert.rejects(() => send({ to: '', subject: 's', body: 'b' }), /to required/);

  // 3) subject 必填
  await assert.rejects(() => send({ to: E1, subject: '', body: 'b' }), /subject required/);

  // 4) body 必填
  await assert.rejects(() => send({ to: E1, subject: 's', body: '' }), /body required/);

  // 5) 邮箱格式校验
  await assert.rejects(() => send({ to: BAD, subject: 's', body: 'b' }), /bad to email/);

  // 6) cc 校验
  await assert.rejects(() => send({ to: E1, cc: E2 + ',' + BAD, subject: 's', body: 'b' }), /bad cc email/);

  // 7) 多收件人
  const m2 = await send({ to: E1 + ',' + E2, subject: 'group', body: 'hi all' });
  assert.strictEqual(m2.status, 'mock');
  assert.ok(m2.message_id);

  // 8) HTML 模式
  const m3 = await send({ to: E1, subject: 'html', body: '<h1>x</h1>', is_html: true });
  assert.strictEqual(m3.status, 'mock');

  // 9) CLI 跑通
  const { execFileSync } = require('child_process');
  const idx = path.join(HERE, 'index.js');
  const out = execFileSync(process.execPath, [idx, '--to', E1, '--subject', 'cli', '--body', 'x'], { encoding: 'utf8' }).trim();
  const cli = JSON.parse(out);
  assert.strictEqual(cli.status, 'mock');
  assert.ok(cli.message_id);

  console.log('OK lark-mail-send (mock + validate + cli)');
})().catch((e) => { console.error('[FAIL]', e.message); process.exit(1); });
