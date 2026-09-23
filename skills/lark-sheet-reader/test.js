// test.js — lark-sheet-reader 自测(mock + dry-run,无 token,纯本地)
// 测:1)mock 返回 2D 数组  2)token 必填  3)dry-run 模式  4)cli 跑通  5)rows_count 正确

'use strict';
const assert = require('assert');
const { readSheet } = require('./index');

(async () => {
  // 1) mock 模式(无 FEISHU_BOT_TOKEN)
  delete process.env.FEISHU_BOT_TOKEN;
  const m = await readSheet({ spreadsheet_token: 'sht_test', range: 'A1:C10' });
  assert.strictEqual(m.status, 'mock');
  assert.strictEqual(m.mode, 'no_token');
  assert.ok(Array.isArray(m.values));
  assert.ok(m.values.length >= 1);
  assert.ok(Array.isArray(m.values[0]));
  assert.strictEqual(m.rows_count, m.values.length);

  // 2) spreadsheet_token 必填
  await assert.rejects(() => readSheet({ spreadsheet_token: '' }), /spreadsheet_token required/);

  // 3) dry-run 模式(有 token 但无 force)
  process.env.FEISHU_BOT_TOKEN = 't_test_dummy';
  const d = await readSheet({ spreadsheet_token: 'sht_test', sheet_id: 'Sheet2' });
  assert.strictEqual(d.status, 'dry-run');
  assert.strictEqual(d.mode, 'live');
  assert.strictEqual(d.sheet_id, 'Sheet2');

  // 4) CLI 跑通
  const { execFileSync } = require('child_process');
  const path = require('path');
  delete process.env.FEISHU_BOT_TOKEN;
  const out = execFileSync(process.execPath, [
    path.join(__dirname, 'index.js'), '--token', 'sht_cli', '--range', 'A1:B3',
  ], { encoding: 'utf8' }).trim();
  const cli = JSON.parse(out);
  assert.strictEqual(cli.status, 'mock');
  assert.ok(Array.isArray(cli.values));

  // 5) 默认 range
  const noRange = await readSheet({ spreadsheet_token: 'sht_x' });
  assert.strictEqual(noRange.range, 'A1:Z100');

  console.log('OK lark-sheet-reader (mock + dry-run + validate + cli + default-range)');
})().catch((e) => { console.error('[FAIL]', e.message); process.exit(1); });
