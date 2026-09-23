// index.js — 飞书审批实例处理(mock + openapi 双模)
// 输入:{instance_id, action, comment?, approver?, force?}
// 输出:{approval_id, status, ts, mode?}
// 凭据:process.env.FEISHU_BOT_TOKEN,无则走 mock
// 红线:不写明文 token,4xx/5xx 不吞错,真发需显式 --force

'use strict';

const https = require('https');
const { URL } = require('url');

const HOST = 'open.feishu.cn';
const ACTIONS = new Set(['approve', 'reject', 'forward']);

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

function rid(s) { return String(s || '').replace(/^(ins|ap):/, ''); }

function fakeId() {
  return 'mock_ap_' + Math.random().toString(36).slice(2, 12);
}

async function postJSON(path, token, body) {
  return await new Promise((resolve, reject) => {
    const req = https.request({
      hostname: HOST, port: 443, path, method: 'POST',
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

async function handle({ instance_id, action, comment, approver, force = false }) {
  if (!instance_id) throw new Error('REPORT_TO_BOSS: instance_id required');
  if (!ACTIONS.has(action)) throw new Error('REPORT_TO_BOSS: bad action: ' + action + ' (approve|reject|forward)');
  if (action === 'forward' && !approver) {
    throw new Error('REPORT_TO_BOSS: approver required for forward');
  }

  const id = rid(instance_id);
  const ts = Date.now();
  const token = process.env.FEISHU_BOT_TOKEN || '';

  if (!token) {
    return { approval_id: fakeId(), status: 'mock', ts, mode: 'no_token', action };
  }

  const path = '/open-apis/approval/v4/instances/' + encodeURIComponent(id) + '/approve';
  const body = {
    action,
    comment: comment || '',
  };
  if (action === 'forward' && approver) {
    body.forward_user_id = rid(approver);
  }

  if (!force) {
    console.log('[dry-run] POST ' + path);
    return { approval_id: 'dryrun_ap_' + id, status: 'dry-run', ts, mode: 'live', action };
  }

  const j = await postJSON(path, token, body);
  if (j.code !== 0) throw new Error('REPORT_TO_BOSS: feishu code=' + j.code + ' msg=' + j.msg);
  const apId = (j.data && j.data.approval_id) || fakeId();
  return { approval_id: apId, status: 'ok', ts, mode: 'live', action };
}

module.exports = { handle };

if (require.main === module) {
  (async () => {
    const args = parseArgs(process.argv);
    try {
      const out = await handle({
        instance_id: args.instance || args.instance_id,
        action: typeof args.action === 'string' ? args.action : '',
        comment: typeof args.comment === 'string' ? args.comment : undefined,
        approver: typeof args.approver === 'string' ? args.approver : undefined,
        force: args.force === true || args.force === 'true',
      });
      console.log(JSON.stringify(out));
    } catch (e) {
      console.error('[FAIL]', e.message);
      process.exit(1);
    }
  })();
}
