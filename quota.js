// quota.js — per-IP daily quota middleware (day 2)
// Storage: data/quota.json  { "<ip>": { date: "YYYY-MM-DD", count: <int> } }
// Plans and limits live here so the webhook can bump them later without touching server.js.
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'data', 'quota.json');

const LIMITS = {
  free: 50,
  pro: 1000,
  team: 10000
};

function todayKey() {
  return new Date().toISOString().slice(0, 10); // UTC day boundary
}

function nextResetISO() {
  const d = new Date();
  d.setUTCHours(24, 0, 0, 0);
  return d.toISOString();
}

function clientIp(req) {
  const xf = (req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return xf || req.ip || (req.socket && req.socket.remoteAddress) || 'unknown';
}

function loadQuota() {
  try {
    if (!fs.existsSync(DATA_FILE)) return {};
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return raw.trim() ? JSON.parse(raw) : {};
  } catch (err) {
    console.error('[quota] load failed:', err.message);
    return {};
  }
}

function saveQuota(db) {
  try {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
  } catch (err) {
    console.error('[quota] save failed:', err.message);
  }
}

// Middleware factory. plan defaults to 'free'.
// Increments the per-IP counter; rejects with 429 when limit is hit.
function requireQuota(plan) {
  const tier = LIMITS[plan] ? plan : 'free';
  const limit = LIMITS[tier];
  return (req, res, next) => {
    const ip = clientIp(req);
    const today = todayKey();
    const db = loadQuota();
    // Sweep stale entries — keep the JSON file bounded.
    for (const k of Object.keys(db)) {
      if (db[k] && db[k].date !== today) delete db[k];
    }
    let entry = db[ip];
    if (!entry || entry.date !== today) {
      entry = { date: today, count: 0 };
    }
    res.setHeader('X-RateLimit-Limit', String(limit));
    res.setHeader('X-RateLimit-Reset', nextResetISO());
    if (entry.count >= limit) {
      const retry = Math.max(1, Math.ceil((Date.parse(nextResetISO()) - Date.now()) / 1000));
      res.setHeader('X-RateLimit-Remaining', '0');
      res.setHeader('Retry-After', String(retry));
      return res.status(429).json({
        error: 'quota_exceeded',
        plan: tier,
        limit,
        reset_at: nextResetISO()
      });
    }
    entry.count += 1;
    db[ip] = entry;
    saveQuota(db);
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, limit - entry.count)));
    next();
  };
}

module.exports = {
  requireQuota,
  LIMITS,
  nextResetISO,
  clientIp,
  loadQuota,
  saveQuota,
  todayKey
};
