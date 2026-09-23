// test.js — lark-im-send 自测(mock 模式,不联网)
// 测:1)mock 返回 fake_id  2)空 chat_id 抛错  3)空 message 抛错  4)cli 跑通

'use strict';
const assert = require('assert');
const { send } = require('./index');

(async () => {
  // 1) mock 模式(无 FEISHU_BOT_TOKEN)
  delete process.env.FEISHU_BOT_TOKEN;
  const m = await send({ chat_id: 'chat:oc_test', message: 'hi' });
  assert.strictEqual(m.status, 'mock');
  assert.ok(/^mock_[a-z0-9]+$/.test(m.message_id), 'mock id shape: ' + m.message_id);
  assert.ok(m.ts > 0);

  // 2) chat_id 必填
  await assert.rejects(() => send({ chat_id: '', message: 'x' }), /chat_id required/);

  // 3) message 必填
  await assert.rejects(() => send({ chat_id: 'oc_x', message: '' }), /message required/);

  // 4) msg_type 校验
  await assert.rejects(() => send({ chat_id: 'oc_x', message: 'x', msg_type: 'video' }), /bad msg_type/);

  // 5) CLI 跑通(node index.js --chat oc_x --message hi)
  const { execFileSync } = require('child_process');
  const out = execFileSync(process.execPath, ['index.js', '--chat', 'oc_x', '--message', 'hi'], { encoding: 'utf8' }).trim();
  const cli = JSON.parse(out);
  assert.strictEqual(cli.status, 'mock');
  assert.ok(cli.message_id);

  console.log('OK lark-im-send (mock + validate + cli)');
})().catch((e) => { console.error('[FAIL]', e.message); process.exit(1); });
