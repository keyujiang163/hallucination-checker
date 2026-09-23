// test.js — xianyu-listing 自测(mock 模式,绝不真发闲鱼)
// 测:1)mock 返回 listing_id 2)queue 文件 append 3)校验 day/title/price 4)cli 跑通
// 思路:开 test 前先把 MARKETING_ROOT 指向 tmp,然后 require index.js,
//      再把 funnel.js 复制到 tmp/tools/marketing-ops/,删除 require cache 强制重读

'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');

// 1) 准备 tmpRoot + funnel 副本
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'xy-test-'));
process.env.MARKETING_ROOT = tmpRoot;
const funnelDst = path.join(tmpRoot, 'tools', 'marketing-ops', 'auto-funnel.js');
fs.mkdirSync(path.dirname(funnelDst), { recursive: true });
const funnelSrc = path.resolve(__dirname, '..', '..', 'tools', 'marketing-ops', 'auto-funnel.js');
fs.copyFileSync(funnelSrc, funnelDst);

const expectedQueue = path.join(tmpRoot, 'memory', 'xianyu-listings.md');

// 2) 现在 require index(此时 FUNNEL_PATH 已用 tmpRoot 解析)
const { listing } = require('./index');

(async () => {
  // 3) mock 模式
  const out = listing({ title: 'skill v1', price: 29, day: 1 });
  assert.strictEqual(out.status, 'mock');
  assert.ok(/^mock_xianyu_[a-z0-9]+$/.test(out.listing_id));
  assert.ok(out.url.includes('goofish.com'));
  assert.strictEqual(out.sku, 'lark-meeting-summary');
  assert.ok(fs.existsSync(expectedQueue), 'queue file created');
  const content = fs.readFileSync(expectedQueue, 'utf8');
  assert.ok(content.includes('skill v1'));
  assert.ok(content.includes('lark-meeting-summary-v1'));

  // 4) append
  const before = fs.statSync(expectedQueue).size;
  listing({ title: 'skill v2', price: 9, day: 6, desc: '小杯' });
  const after = fs.statSync(expectedQueue).size;
  assert.ok(after > before, 'queue appended');

  // 5) 校验
  assert.throws(() => listing({ price: 9, day: 1 }), /title required/);
  assert.throws(() => listing({ title: 'x', day: 1 }), /price required/);
  assert.throws(() => listing({ title: 'x', price: 0, day: 1 }), /price required/);
  assert.throws(() => listing({ title: 'x', price: 9, day: 0 }), /day required/);
  assert.throws(() => listing({ title: 'x', price: 9, day: 31 }), /day required/);
  assert.throws(() => listing({ title: 'x', price: 9, day: 'a' }), /day required/);

  // 6) day=30 边界
  const last = listing({ title: 'last', price: 9, day: 30 });
  assert.strictEqual(last.sku, 'pomodoro-tracker');

  // 7) CLI
  const { execFileSync } = require('child_process');
  const idx = path.join(__dirname, 'index.js');
  const cli = JSON.parse(execFileSync(process.execPath, [idx, '--title', 'cli-title', '--price', '19', '--day', '15'], {
    encoding: 'utf8',
    env: Object.assign({}, process.env, { MARKETING_ROOT: tmpRoot }),
  }).trim());
  assert.strictEqual(cli.status, 'mock');
  assert.ok(cli.listing_id);

  // 8) 清理
  fs.rmSync(tmpRoot, { recursive: true, force: true });

  console.log('OK xianyu-listing (mock + queue + validate + cli)');
})().catch((e) => { console.error('[FAIL]', e.message); process.exit(1); });
