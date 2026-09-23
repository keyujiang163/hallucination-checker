// test.js — dev-runner
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const runner = require('./runner');

assert.strictEqual(typeof runner.run, 'function');
assert.strictEqual(typeof runner.logFileFor, 'function');

// happy path
(async () => {
  const r1 = await runner.run({
    task: 'test-happy',
    timeoutMs: 5000,
    fn: async () => 42
  });
  assert.strictEqual(r1.ok, true);
  assert.strictEqual(r1.timedOut, false);
  assert.strictEqual(r1.result, 42);
  assert.ok(r1.duration >= 0);
  assert.ok(r1.logPath.includes('dev-runner-test-happy'));
  assert.ok(fs.existsSync(r1.logPath), 'log created');
  fs.unlinkSync(r1.logPath);

  // timeout path
  const r2 = await runner.run({
    task: 'test-timeout',
    timeoutMs: 200,
    fn: async () => { await new Promise((r) => setTimeout(r, 2000)); return 'never'; }
  });
  assert.strictEqual(r2.ok, false);
  assert.strictEqual(r2.timedOut, true);
  assert.ok(r2.error.startsWith('TIMEOUT_AT'));
  assert.ok(r2.duration >= 200);
  assert.ok(fs.existsSync(r2.logPath));
  const logContent = fs.readFileSync(r2.logPath, 'utf8');
  assert.ok(logContent.includes('TIMEOUT_AT'), 'timeout logged');
  fs.unlinkSync(r2.logPath);

  console.log('OK dev-runner (2 paths)');
})().catch((e) => { console.error(e); process.exit(1); });
