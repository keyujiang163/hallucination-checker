// test.js — boss-secretary
const assert = require('assert');
const fs = require('fs');
const path = require('path');

assert.ok(fs.existsSync(path.join(__dirname, 'SKILL.md')), 'SKILL.md missing');
assert.ok(fs.existsSync(path.join(__dirname, 'boss-secretary.js')), 'boss-secretary.js missing');

const m = require('./boss-secretary.js');
assert.strictEqual(typeof m.gatherReport, 'function');
assert.strictEqual(typeof m.feishuPost, 'function');

const r = m.gatherReport();
assert.ok(r.date.match(/^\d{4}-\d{2}-\d{2}$/), 'date format');
assert.strictEqual(typeof r.checks_today, 'number');
assert.strictEqual(typeof r.pending_tasks, 'number');

console.log('OK boss-secretary:', JSON.stringify(r));
