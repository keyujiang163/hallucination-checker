// index.js — 飞书邮箱发邮件(mock + openapi 双模)
// 输入:{to, subject, body, cc?, bcc?, is_html?=false, force?}
// 输出:{message_id, status, mode?}
// 凭据:process.env.FEISHU_BOT_TOKEN,无则走 mock
// 红线:不写明文 token,4xx/5xx 不吞错,真发需显式 --force

'use strict';

const https = require('https');
const { URL } = require('url');

const ENDPOINT = 'https://open.feishu.cn/open-apis/mail/v1/user_mailboxes/me/messages';

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const k = a.slice(2);
      const v = argv[i + 1];
      out[k] = (v && !v.startsWith('--')) ? v : true;
      if (v && !v.startsWith('--')) i++;
    }
  }
  return out;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function splitEmails(s) {
  if (!s) return [];
  return String(s).split(',').map((x) => x.trim()).filter(Boolean);
}

function validateEmails(list, field) {
  for (const e of list) {
    if (!EMAIL_RE.test(e)) {
      throw new Error('REPORT_TO_BOSS: bad ' + field + ' email: ' + e);
    }
  }
}

function fakeId(prefix) {
  return (prefix || 'mock_') + Math.random().toString(36).slice(2, 12);
}

async function postJSON(u, token, body) {
  return await new Promise((resolve, reject) => {
    const req = https.request({
      hostname: u.hostname, port: 443, path: u.pathname + u.search, method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': 'Bearer ' + token,
      },
      timeout: 10000,
    }, (res) => {
      let buf = '';
      res.on('data', (c) => (buf += c));
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(JSON.parse(buf)); }
          catch (e) { reject(new Error('REPORT_TO_BOSS: bad json ' + e.message)); }
        } else {
          reject(new Error('REPORT_TO_BOSS: http ' + res.statusCode + ' body=' + buf.slice(0, 200)));
        }
      });
    });
    req.on('error', (e) => reject(new Error('REPORT_TO_BOSS: net ' + e.message)));
    req.on('timeout', () => { req.destroy(new Error('timeout')); });
    req.write(JSON.stringify(body));
    req.end();
  });
}

async function send({ to, subject, body, cc, bcc, is_html = false, force = false }) {
  if (!to) throw new Error('REPORT_TO_BOSS: to required');
  if (!subject) throw new Error('REPORT_TO_BOSS: subject required');
  if (typeof body !== 'string' || !body.length) throw new Error('REPORT_TO_BOSS: body required');

  const toList = Array.isArray(to) ? to : splitEmails(to);
  const ccList = Array.isArray(cc) ? cc : splitEmails(cc);
  const bccList = Array.isArray(bcc) ? bcc : splitEmails(bcc);
  validateEmails(toList, 'to');
  validateEmails(ccList, 'cc');
  validateEmails(bccList, 'bcc');

  const token = process.env.FEISHU_BOT_TOKEN || '';

  if (!token) {
    return { message_id: fakeId('mock_msg_'), status: 'mock', mode: 'no_token' };
  }

  if (!force) {
    console.log('[dry-run] POST ' + ENDPOINT);
    return { message_id: 'dryrun_msg_' + Date.now(), status: 'dry-run', mode: 'live' };
  }

  const payload = {
    to: toList.map((e) => ({ mail_address: e })),
    subject,
    body: { content_type: is_html ? 'html' : 'text', content: body },
  };
  if (ccList.length) payload.cc = ccList.map((e) => ({ mail_address: e }));
  if (bccList.length) payload.bcc = bccList.map((e) => ({ mail_address: e }));

  const u = new URL(ENDPOINT);
  const j = await postJSON(u, token, payload);
  if (j.code !== 0) throw new Error('REPORT_TO_BOSS: feishu code=' + j.code + ' msg=' + j.msg);
  const id = (j.data && j.data.message_id) || fakeId('msg_');
  return { message_id: id, status: 'ok', mode: 'live' };
}

module.exports = { send };

if (require.main === module) {
  (async () => {
    const args = parseArgs(process.argv);
    try {
      const out = await send({
        to: args.to,
        subject: args.subject,
        body: args.body,
        cc: args.cc,
        bcc: args.bcc,
        is_html: args.is_html === true || args.is_html === 'true',
        force: args.force === true || args.force === 'true',
      });
      console.log(JSON.stringify(out));
    } catch (e) {
      console.error('[FAIL]', e.message);
      process.exit(1);
    }
  })();
}
