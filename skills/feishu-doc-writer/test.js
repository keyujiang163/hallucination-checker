// test.js — feishu-doc-writer 自测(mock 模式,不联网)

'use strict';
const assert = require('assert');
const path = require('path');
const { write } = require('./index');

(async () => {
  delete process.env.FEISHU_BOT_TOKEN;
  delete process.env.ALLOW_LIVE;

  // 1) mock
  const m = await write({ title: 'T', content: 'C' });
  assert.strictEqual(m.status, 'mock');
  assert.ok(/^mock_doc_[a-z0-9]+$/.test(m.doc_token));
  assert.ok(m.url.startsWith('https://feishu.cn/docx/'));

  // 2) 校验
  await assert.rejects(async () => write({ content: 'x' }), /title required/);
  await assert.rejects(async () => write({ title: '', content: 'x' }), /title required/);
  await assert.rejects(async () => write({ title: 'T' }), /content required/);
  await assert.rejects(async () => write({ title: 'T', content: '   ' }), /content required/);

  // 3) CLI
  const { execFileSync } = require('child_process');
  const idx = path.join(__dirname, 'index.js');
  const out = execFileSync(process.execPath, [idx, '--title', 'CLI', '--content', '正文'], { encoding: 'utf8' }).trim();
  const cli = JSON.parse(out);
  assert.strictEqual(cli.status, 'mock');
  assert.ok(cli.doc_token);
  assert.ok(cli.url);

  console.log('OK feishu-doc-writer (mock + validate + cli)');
})().catch((e) => { console.error('[FAIL]', e.message); process.exit(1); });
