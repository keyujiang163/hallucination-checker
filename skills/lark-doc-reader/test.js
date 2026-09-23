// test.js — lark-doc-reader 自测(mock 模式,不联网)
'use strict';
const assert = require('assert');
const { read } = require('./index');

(async () => {
  delete process.env.FEISHU_BOT_TOKEN;

  // 1) mock 默认 docx
  const m = await read({ doc_token: 'doxcnTEST' });
  assert.strictEqual(m.status, 'mock');
  assert.ok(m.content.includes('doxcnTEST'));
  assert.strictEqual(m.blocks_count, 1);

  // 2) mock wiki
  const w = await read({ doc_token: 'wikcnWIKI', type: 'wiki' });
  assert.strictEqual(w.status, 'mock');
  assert.ok(w.content.includes('wiki'));

  // 3) token 必填
  await assert.rejects(() => read({ doc_token: '' }), /doc_token required/);

  // 4) type 校验
  await assert.rejects(() => read({ doc_token: 'x', type: 'video' }), /bad type/);

  // 5) CLI 跑通
  const { execFileSync } = require('child_process');
  const out = execFileSync(process.execPath, ['index.js', '--token', 'doxcnCLI', '--type', 'docx'], { encoding: 'utf8' }).trim();
  const cli = JSON.parse(out);
  assert.strictEqual(cli.status, 'mock');
  assert.ok(cli.content.includes('doxcnCLI'));

  console.log('OK lark-doc-reader (mock + validate + cli)');
})().catch((e) => { console.error('[FAIL]', e.message); process.exit(1); });
