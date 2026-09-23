// test.js — lark-contact-resolve 自测(mock 模式,不联网)

'use strict';
const assert = require('assert');
const path = require('path');
const { resolve } = require('./index');

(async () => {
  delete process.env.FEISHU_BOT_TOKEN;
  delete process.env.ALLOW_LIVE;

  // 1) name -> mock
  const a = await resolve({ name: '老板' });
  assert.strictEqual(a.status, 'mock');
  assert.ok(/^mock_ou_[a-z0-9]+$/.test(a.open_id));
  assert.strictEqual(a.name, '老板');
  assert.strictEqual(a.email, null);

  // 2) email -> mock
  const b = await resolve({ email: '[email protected]' });
  assert.strictEqual(b.status, 'mock');
  assert.ok(b.open_id.startsWith('mock_ou_'));
  assert.strictEqual(b.email, '[email protected]');

  // 3) 必填校验(Node 24 assert.rejects 对同步抛错行为不同,用 async 包一层)
  await assert.rejects(async () => resolve({ type: 'name' }), /name required/);
  await assert.rejects(async () => resolve({ name: '' }), /name required/);
  await assert.rejects(async () => resolve({ type: 'email' }), /email required/);
  await assert.rejects(async () => resolve({ type: 'phone' }), /bad type/);

  // 4) CLI
  const { execFileSync } = require('child_process');
  const idx = path.join(__dirname, 'index.js');
  const out = execFileSync(process.execPath, [idx, '--name', '测试'], { encoding: 'utf8' }).trim();
  const cli = JSON.parse(out);
  assert.strictEqual(cli.status, 'mock');
  assert.ok(cli.open_id);

  console.log('OK lark-contact-resolve (mock + validate + cli)');
})().catch((e) => { console.error('[FAIL]', e.message); process.exit(1); });
