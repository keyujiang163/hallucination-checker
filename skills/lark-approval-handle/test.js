// test.js — lark-approval-handle 自测(mock 模式,不联网)
// 测:1)mock 返回 fake_id 2)空 instance 抛错 3)action 校验 4)forward 缺 approver 抛错 5)cli 跑通

'use strict';
const assert = require('assert');
const path = require('path');
const { handle } = require('./index');

const HERE = __dirname;

(async () => {
  // 1) mock 模式(无 FEISHU_BOT_TOKEN)
  delete process.env.FEISHU_BOT_TOKEN;
  const m = await handle({ instance_id: 'ins_ABC123', action: 'approve' });
  assert.strictEqual(m.status, 'mock');
  assert.ok(/^mock_ap_[a-z0-9]+$/.test(m.approval_id), 'mock id shape: ' + m.approval_id);
  assert.strictEqual(m.action, 'approve');
  assert.ok(m.ts > 0);

  // 2) instance_id 必填
  await assert.rejects(() => handle({ instance_id: '', action: 'approve' }), /instance_id required/);

  // 3) action 必填且合法
  await assert.rejects(() => handle({ instance_id: 'ins_ABC', action: '' }), /bad action/);
  await assert.rejects(() => handle({ instance_id: 'ins_ABC', action: 'delete' }), /bad action/);

  // 4) forward 需 approver
  await assert.rejects(() => handle({ instance_id: 'ins_ABC', action: 'forward' }), /approver required/);

  // 5) reject 带 comment
  const r = await handle({ instance_id: 'ins_X', action: 'reject', comment: '材料不齐' });
  assert.strictEqual(r.status, 'mock');
  assert.strictEqual(r.action, 'reject');

  // 6) forward 带 approver
  const f = await handle({ instance_id: 'ins_Y', action: 'forward', approver: 'ou_BOB' });
  assert.strictEqual(f.status, 'mock');
  assert.strictEqual(f.action, 'forward');

  // 7) CLI 跑通
  const { execFileSync } = require('child_process');
  const idx = path.join(HERE, 'index.js');
  const out = execFileSync(process.execPath, [idx, '--instance', 'ins_CLI', '--action', 'approve'], { encoding: 'utf8' }).trim();
  const cli = JSON.parse(out);
  assert.strictEqual(cli.status, 'mock');
  assert.ok(cli.approval_id);

  console.log('OK lark-approval-handle (mock + validate + cli)');
})().catch((e) => { console.error('[FAIL]', e.message); process.exit(1); });
