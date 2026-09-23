// index.js — lark-task-create(飞书 Task v2)
// 输入:{title, due?, assignee?, list_id?}
// 输出:{task_id, url, status}
// 凭据:process.env.FEISHU_BOT_TOKEN,无则 mock
// 红线:title 必填;无 token 走 mock,不调真 API

'use strict';

const https = require('https');
const { URL } = require('url');

const HOST = 'open.feishu.cn';
const PATH = '/open-apis/task/v2/tasks';

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

function rid(s) { return String(s || '').replace(/^(chat|open|email|user|thread|list):/, ''); }

async function postJson(host, p, token, body) {
  return new Promise((resolve, reject) => {
    const data = Buffer.from(JSON.stringify(body), 'utf8');
    const req = https.request({
      host, path: p, method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': data.length,
      },
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
    req.write(data);
    req.end();
  });
}

async function create({ title, due, assignee, list_id }) {
  if (!title || typeof title !== 'string' || !title.trim()) {
    throw new Error('REPORT_TO_BOSS: title required');
  }
  const token = process.env.FEISHU_BOT_TOKEN || '';
  const ts = Date.now();

  if (!token) {
    const fake = 'mock_task_' + Math.random().toString(36).slice(2, 10);
    return { task_id: fake, url: 'https://feishu.cn/task/' + fake, status: 'mock', ts };
  }
  // magic 模式(预留):有 token 但本子代理默认只 mock,除非显式 ALLOW_LIVE=1
  if (process.env.ALLOW_LIVE !== '1') {
    const fake = 'dry_task_' + Math.random().toString(36).slice(2, 10);
    return { task_id: fake, url: 'https://feishu.cn/task/' + fake, status: 'dry', ts };
  }

  const body = {
    summary: title,
    due: due ? { timestamp: due } : undefined,
    members: assignee ? [{ id: rid(assignee), role: 'assignee' }] : undefined,
    tasklist_id: list_id ? rid(list_id) : undefined,
  };
  const resp = await postJson(HOST, PATH, token, body);
  const id = (resp && resp.data && resp.data.task && resp.data.task.id) || 'unknown';
  return { task_id: id, url: 'https://feishu.cn/task/' + id, status: 'created', ts };
}

module.exports = { create, parseArgs };

if (require.main === module) {
  (async () => {
    try {
      const args = parseArgs(process.argv);
      const out = await create({
        title: args.title,
        due: args.due,
        assignee: args.assignee,
        list_id: args.list || args.list_id,
      });
      console.log(JSON.stringify(out));
    } catch (e) {
      console.error('[FAIL]', e.message);
      process.exit(1);
    }
  })();
}
