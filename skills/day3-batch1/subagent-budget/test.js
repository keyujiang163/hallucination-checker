// test.js — subagent-budget
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const budget = require('./budget');

// reset state file
const DATA = path.resolve(__dirname, '..', '..', 'data', 'budget.json');
try { fs.unlinkSync(DATA); } catch {}

budget.setLimit('test-agent', 2);
const st1 = budget.status('test-agent');
assert.strictEqual(st1.max, 2);
assert.strictEqual(st1.active, 0);

budget.release('test-agent'); // safe even when 0
assert.strictEqual(budget.status('test-agent').active, 0);

(async () => {
  budget.setLimit('test-agent', 1);
  const r1 = await budget.acquire('test-agent', { timeoutMs: 500, pollMs: 20 });
  assert.strictEqual(r1.ok, true);
  const r2 = await budget.acquire('test-agent', { timeoutMs: 150, pollMs: 30 });
  assert.strictEqual(r2.ok, false);
  assert.strictEqual(r2.reason, 'timeout');
  budget.release('test-agent');
  const r3 = await budget.acquire('test-agent', { timeoutMs: 200 });
  assert.strictEqual(r3.ok, true);
  budget.release('test-agent');
  // cleanup
  try { fs.unlinkSync(DATA); } catch {}
  console.log('OK subagent-budget (setLimit + acquire timeout + release)');
})().catch((e) => { console.error(e); process.exit(1); });
