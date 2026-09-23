// test.js — openclaw-audit
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const audit = require('./audit');

assert.strictEqual(typeof audit.wrap, 'function');
assert.strictEqual(typeof audit.summary, 'function');
assert.strictEqual(typeof audit.logFileFor, 'function');

const lp = audit.logFileFor('test-task');
assert.ok(lp.includes('dev-run-test-task'), 'log path format: ' + lp);
assert.ok(lp.endsWith('.log'), 'log extension');

const log = audit.createLogger('test-task-2');
assert.ok(log.logPath.includes('dev-run-test-task-2'));
log.write('test line');
assert.ok(fs.existsSync(log.logPath), 'log file created');
const content = fs.readFileSync(log.logPath, 'utf8');
assert.ok(content.includes('test line'), 'log content written');
fs.unlinkSync(log.logPath);

const sumPath = audit.summary('test-task-3', { runtime: '5s', status: 'failed', error: 'demo', last_action: 'x', probable_cause: 'y' });
assert.ok(fs.existsSync(sumPath), 'summary log created');
const sumContent = fs.readFileSync(sumPath, 'utf8');
assert.ok(sumContent.includes('=== SUMMARY ==='), 'summary marker');
assert.ok(sumContent.includes('demo'), 'summary error content');
fs.unlinkSync(sumPath);

console.log('OK openclaw-audit');
