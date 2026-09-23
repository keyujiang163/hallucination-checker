// budget.js — 子代理并发上限护栏
// 用途:acquire/release 计数 + 持久化 + 自动排队
// 作者:dev-day3-batch1(主会话接力)
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.resolve(__dirname, '..', '..', 'data');
const BUDGET_FILE = path.join(DATA_DIR, 'budget.json');
const DEFAULT_MAX = 2;

function ensureDir() {
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (e) {}
}

function readState() {
  try { return JSON.parse(fs.readFileSync(BUDGET_FILE, 'utf8')); }
  catch { return {}; }
}

function writeState(state) {
  ensureDir();
  fs.writeFileSync(BUDGET_FILE, JSON.stringify(state, null, 2), 'utf8');
}

function setLimit(agentId, max) {
  const s = readState();
  if (!s[agentId]) s[agentId] = { active: 0, max: max, history: [] };
  else s[agentId].max = max;
  writeState(s);
}

function status(agentId) {
  const s = readState();
  if (!agentId) return s;
  return s[agentId] || { active: 0, max: DEFAULT_MAX, history: [] };
}

function canAcquire(agentId) {
  const s = readState();
  const cur = s[agentId] || { active: 0, max: DEFAULT_MAX };
  return cur.active < cur.max;
}

function _doAcquire(agentId) {
  const s = readState();
  if (!s[agentId]) s[agentId] = { active: 0, max: DEFAULT_MAX, history: [] };
  if (s[agentId].active < s[agentId].max) {
    s[agentId].active += 1;
    s[agentId].history.push({ at: new Date().toISOString(), action: 'acquire' });
    writeState(s);
    return true;
  }
  return false;
}

function release(agentId) {
  const s = readState();
  if (!s[agentId]) return false;
  if (s[agentId].active > 0) s[agentId].active -= 1;
  s[agentId].history.push({ at: new Date().toISOString(), action: 'release' });
  writeState(s);
  return true;
}

async function acquire(agentId, opts) {
  opts = opts || {};
  const max = opts.max || DEFAULT_MAX;
  const s0 = readState();
  if (!s0[agentId]) { s0[agentId] = { active: 0, max: max, history: [] }; writeState(s0); }
  const startedAt = Date.now();
  while (true) {
    if (_doAcquire(agentId)) {
      return { ok: true, agentId: agentId, waitedMs: Date.now() - startedAt };
    }
    if (opts.timeoutMs && (Date.now() - startedAt) >= opts.timeoutMs) {
      return { ok: false, agentId: agentId, waitedMs: Date.now() - startedAt, reason: 'timeout' };
    }
    await new Promise((r) => setTimeout(r, opts.pollMs || 200));
  }
}

module.exports = { acquire: acquire, release: release, status: status, setLimit: setLimit, canAcquire: canAcquire };
