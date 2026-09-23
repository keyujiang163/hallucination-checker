// test.js — env-vault
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vault = require('./vault');

assert.strictEqual(typeof vault.get, 'function');
assert.strictEqual(typeof vault.set, 'function');
assert.strictEqual(typeof vault.mask, 'function');

// mask (default headLen=4, tailLen=8 → v.slice(0,4) + '****' + v.slice(-8))
assert.strictEqual(vault.mask('ghp_abc123def456ghi789jkl012mno345pqr678'), 'ghp_****45pqr678');
assert.strictEqual(vault.mask('short'), '*****'); // <= 12 chars → all stars
assert.strictEqual(vault.mask(''), '');
assert.strictEqual(vault.mask(null), null);
assert.strictEqual(vault.mask('1234567890'), '**********'); // 10 chars <= 12 → all stars
assert.strictEqual(vault.mask('abcdefghijklmnop', { tailLen: 4 }), 'abcd****mnop');

// get/set/del with isolated test file (don't pollute real vault)
const tmpVault = path.join(require('os').tmpdir(), 'vault-test-' + Date.now() + '.json');
const realVault = vault._path;
// monkeypatch via writing our own minimal vault test (use real, then cleanup)
const testKey = 'TEST_KEY_' + Date.now();
assert.strictEqual(vault.get(testKey), null);
vault.set(testKey, 'secret-value-1234567890');
assert.strictEqual(vault.get(testKey), 'secret-value-1234567890');
assert.strictEqual(vault.mask(vault.get(testKey)), 'secr****34567890');
const keys = vault.list();
assert.ok(keys.includes(testKey), 'key listed');
vault.del(testKey);
assert.strictEqual(vault.get(testKey), null);

console.log('OK env-vault (mask + get/set/del/list)');
