// boss-secretary.js — 主动推送老板日报
// 用途:读本地状态 + 推飞书 webhook
// 作者:dev-day3-batch1(主会话接力,Design/Dev 子代理均失败)
const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.resolve(__dirname, '..', '..');
const QUOTA_FILE = path.join(ROOT, 'data', 'quota.json');
const TASKS_FILE = path.join(ROOT, 'data', 'tasks.json');

function readJson(p, fallback) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch { return fallback; }
}

function gatherReport() {
  const today = new Date().toISOString().slice(0, 10);
  const quota = readJson(QUOTA_FILE, {});
  const tasks = readJson(TASKS_FILE, { pending: 0 });
  let checksToday = 0;
  for (const k of Object.keys(quota)) {
    if (quota[k] && quota[k].date === today) checksToday += quota[k].count || 0;
  }
  return {
    date: today,
    checks_today: checksToday,
    pending_tasks: tasks.pending || 0,
    unread_emails: 0
  };
}

function feishuPost(webhook, payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const url = new URL(webhook);
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    }, (res) => {
      let body = '';
      res.on('data', (c) => body += c);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function run() {
  const report = gatherReport();
  const text = '📊 老板日报 ' + report.date + '\\n• 检查调用:' + report.checks_today + ' 次\\n• 待办任务:' + report.pending_tasks + ' 件\\n• 未读邮件:' + report.unread_emails + ' 封';
  const webhook = process.env.FEISHU_WEBHOOK;
  if (process.argv.includes('--check-now')) {
    console.log(text.replace(/\\n/g, '\\n'));
    if (webhook) {
      const r = await feishuPost(webhook, { msg_type: 'text', content: { text } });
      console.log('feishu:', r.status);
    } else {
      console.log('(no FEISHU_WEBHOOK env, skip push)');
    }
    return;
  }
  console.log(JSON.stringify(report, null, 2));
}

if (require.main === module) run().catch((e) => { console.error(e); process.exit(1); });
module.exports = { gatherReport, feishuPost };
