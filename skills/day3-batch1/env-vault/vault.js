// vault.js — 凭据安全管理
// 用途:get/set/mask/list/del,永不走明文到日志 / commit / 飞书
// 作者:dev-day3-batch1(主会话接力)
const fs = require('fs');
const path = require('path');
const os = require('os');

const VAULT_DIR = path.join(os.homedir(), '.openclaw');
const VAULT_FILE = path.join(VAULT_DIR, 'vault.json');

function ensureDir() {
  try { fs.mkdirSync(VAULT_DIR, { recursive: true }); } catch (e) {}
}

function readAll() {
  try { return JSON.parse(fs.readFileSync(VAULT_FILE, 'utf8')); }
  catch { return {}; }
}

function writeAll(state) {
  ensureDir();
  fs.writeFileSync(VAULT_FILE, JSON.stringify(state, null, 2), 'utf8');
  // Windows: try to set ACL via cmd; POSIX: chmod 600
  try {
    if (process.platform !== 'win32') fs.chmodSync(VAULT_FILE, 0o600);
  } catch (e) {}
}

function get(key) {
  if (!key) return null;
  const s = readAll();
  return Object.prototype.hasOwnProperty.call(s, key) ? s[key].value : null;
}

function set(key, value, opts) {
  opts = opts || {};
  if (!key) throw new Error('vault.set: key required');
  if (typeof value !== 'string') throw new Error('vault.set: value must be string');
  const s = readAll();
  s[key] = {
    value: value,
    source: opts.source || 'manual',
    created_at: s[key] ? s[key].created_at : new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  writeAll(s);
  return true;
}

function del(key) {
  const s = readAll();
  if (Object.prototype.hasOwnProperty.call(s, key)) {
    delete s[key];
    writeAll(s);
    return true;
  }
  return false;
}

function list() {
  const s = readAll();
  return Object.keys(s);
}

function mask(value, opts) {
  opts = opts || {};
  if (value == null) return null;
  const v = String(value);
  if (v.length === 0) return '';
  const headLen = opts.headLen != null ? opts.headLen : 4;
  const tailLen = opts.tailLen != null ? opts.tailLen : 8;
  if (v.length <= headLen + tailLen) return '*'.repeat(v.length);
  return v.slice(0, headLen) + '****' + v.slice(v.length - tailLen);
}

// safety: never log full value via toString
const _safeStringify = (k) => '"' + k + '"';
function _redact(state) {
  const out = {};
  for (const k of Object.keys(state)) {
    out[k] = { source: state[k].source, created_at: state[k].created_at, updated_at: state[k].updated_at, mask: mask(state[k].value) };
  }
  return out;
}

module.exports = {
  get: get,
  set: set,
  del: del,
  list: list,
  mask: mask,
  _redact: _redact,
  _path: VAULT_FILE
};
