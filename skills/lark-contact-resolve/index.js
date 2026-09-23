// index.js — lark-contact-resolve(姓名/邮箱 → open_id)
// 输入:{name|email, type?}
// 输出:{open_id, name, email, status}
// 红线:无 token 走 mock,不调真 API

'use strict';

const https = require('https');
const { URL } = require('url');

const HOST = 'open.feishu.cn';

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a && a.startsWith('--')) {
      const k = a.slice(2);
      const v = argv[i + 1];
      out[k] = (v && !v.startsWith('--')) ? v : true;
      if (v && !v.startsWith('--')) i++;
    }
  }
  return out;
}

async function getJson(host, p, token, qs) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      host, path: p + (qs ? ('?' + qs) : ''), method: 'GET',
      headers: { 'Authorization': 'Bearer ' + token },
      timeout: 8000,
    }, (res) => {
      let chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        if (res.statusCode >= 400) {
          return reject(new Error('REPORT_TO_BOSS: feishu ' + res.statusCode + ' ' + raw.slice(0, 200)));
        }
        try { resolve(JSON.parse(raw)); }
        catch (e) { reject(new Error('REPORT_TO_BOSS: bad json ' + raw.slice(0, 200))); }
      });
    });
    req.on('error', (e) => reject(new Error('REPORT_TO_BOSS: net ' + e.message)));
    req.on('timeout', () => { req.destroy(new Error('REPORT_TO_BOSS: timeout')) });
    req.end();
  });
}

function resolve({ name, email, type }) {
  const t = type || (email ? 'email' : 'name');
  if (t === 'name' && (!name || !String(name).trim())) {
    throw new Error('REPORT_TO_BOSS: name required');
  }
  if (t === 'email' && (!email || !String(email).trim())) {
    throw new Error('REPORT_TO_BOSS: email required');
  }
  if (!['name', 'email'].includes(t)) {
    throw new Error('REPORT_TO_BOSS: bad type ' + t);
  }

  const token = process.env.FEISHU_BOT_TOKEN || '';
  if (!token) {
    const fake = 'mock_ou_' + Math.random().toString(36).slice(2, 10);
    return Promise.resolve({
      open_id: fake,
      name: name || email.split('@')[0],
      email: email || null,
      status: 'mock',
      ts: Date.now(),
    });
  }
  if (process.env.ALLOW_LIVE !== '1') {
    const fake = 'dry_ou_' + Math.random().toString(36).slice(2, 10);
    return Promise.resolve({
      open_id: fake,
      name: name || email.split('@')[0],
      email: email || null,
      status: 'dry',
      ts: Date.now(),
    });
  }

  const qs = t === 'email'
    ? 'emails=' + encodeURIComponent(email)
    : 'name=' + encodeURIComponent(name);
  return getJson(HOST, '/open-apis/contact/v3/users/batch_get', token, qs)
    .then((resp) => {
      const u = (resp && resp.data && resp.data.users && resp.data.users[0]) || {};
      return {
        open_id: u.open_id || 'unknown',
        name: u.name || name || email,
        email: u.email || email || null,
        status: 'resolved',
        ts: Date.now(),
      };
    });
}

module.exports = { resolve, parseArgs };

if (require.main === module) {
  (async () => {
    try {
      const a = parseArgs(process.argv);
      const out = await resolve({ name: a.name, email: a.email, type: a.type });
      console.log(JSON.stringify(out));
    } catch (e) {
      console.error('[FAIL]', e.message);
      process.exit(1);
    }
  })();
}
