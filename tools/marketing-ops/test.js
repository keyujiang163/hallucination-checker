// test.js — 6 个 smoke test
// 跑法:node tools/marketing-ops/test.js

'use strict';

const poster = require('./auto-poster');
const funnel = require('./auto-funnel');
const cs = require('./auto-cs');
const renew = require('./auto-renew');
const main = require('./main');

const TESTS = [];
let pass = 0;
let fail = 0;

function test(name, fn) {
  TESTS.push({ name, fn });
}

function eq(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

// 1. testPoster
test('testPoster', async () => {
  const out = await poster.postNote({ time_slot: 'morning', day: 1 });
  if (!out || !out.title || !Array.isArray(out.tags)) throw new Error('missing title/tags');
  if (out.title.length < 5) throw new Error('title too short');
  if (out.tags.length !== 10) throw new Error('tags should be 10, got ' + out.tags.length);
});

// 2. testFunnelOrder
test('testFunnelOrder', async () => {
  const out = await funnel.funnel({ event: 'order', payload: { day: 1, order_id: 'test-1' } });
  if (out.action !== 'ship') throw new Error('expected action=ship, got ' + out.action);
  if (!out.link || !out.link.startsWith('http')) throw new Error('expected http link');
});

// 3. testCsMatch
test('testCsMatch', async () => {
  const out = await cs.respond({ platform: 'feishu', user_id: 'u1', text: '能退款吗' });
  if (out.matched !== true) throw new Error('expected matched=true');
  if (!out.reply.includes('7 天')) throw new Error('reply should mention 7 天, got: ' + out.reply);
});

// 4. testCsNoMatch
test('testCsNoMatch', async () => {
  const out = await cs.respond({ platform: 'feishu', user_id: 'u1', text: '你好' });
  if (out.matched !== false) throw new Error('expected matched=false');
  if (!out.reply.includes('老板')) throw new Error('reply should mention 老板, got: ' + out.reply);
});

// 5. testRenewWarn
test('testRenewWarn', async () => {
  const exp = new Date(Date.now() + 5 * 86400000);
  const out = await renew.checkRenew({ user_id: 'u1', expire_at: exp });
  if (out.action !== 'warn') throw new Error('expected action=warn');
  if (out.days_left !== 5) throw new Error('expected days_left=5, got ' + out.days_left);
});

// 6. testSerial — 4 职能串行跑一遍
test('testSerial', async () => {
  // 验证源码里没有 Promise.all (本意图是"4 职能串行,不并发")
  // 去掉注释行再 grep,避免自指
  const fs = require('fs');
  const path = require('path');
  const src = fs.readFileSync(path.join(__dirname, 'main.js'), 'utf8');
  const codeOnly = src.split('\n').filter(line => !line.trim().startsWith('//')).join('\n');
  if (/Promise\.all\s*\(/.test(codeOnly)) {
    throw new Error('main.js should not use Promise.all (serial only)');
  }
  // 真跑一遍
  const results = await main.runAllSerial({ time_slot: 'morning', day: 2, cs_text: '怎么用', renew_days: 5 });
  if (!Array.isArray(results) || results.length !== 4) throw new Error('expected 4 results');
  for (const r of results) {
    if (r.ok !== true) throw new Error('serial step failed: ' + JSON.stringify(r));
  }
});

(async () => {
  for (const t of TESTS) {
    try {
      await t.fn();
      pass++;
      console.log('[PASS] ' + t.name);
    } catch (e) {
      fail++;
      console.log('[FAIL] ' + t.name + ' :: ' + e.message);
    }
  }
  console.log('---');
  console.log('TOTAL: ' + (pass + fail) + ', PASS: ' + pass + ', FAIL: ' + fail);
  process.exit(fail === 0 ? 0 : 1);
})();
