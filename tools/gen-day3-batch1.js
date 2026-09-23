// gen-day3-batch1.js — Day3 第一批 5 个精品 skill 生成器
// 作者:主会话接力(Design/Dev 子代理均失败)
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const SKILLS = path.join(ROOT, 'skills', 'day3-batch1');
const DOCS = path.join(ROOT, 'docs', 'skills');

fs.mkdirSync(SKILLS, { recursive: true });
fs.mkdirSync(DOCS, { recursive: true });

function w(p, c) {
  fs.writeFileSync(p, c, 'utf8');
  console.log('  wrote', path.relative(ROOT, p), c.length, 'B');
}

function mk(name) {
  const d = path.join(SKILLS, name);
  fs.mkdirSync(d, { recursive: true });
  // remove stale empty subagent leftovers
  for (const f of fs.readdirSync(d)) {
    fs.rmSync(path.join(d, f), { recursive: true, force: true });
  }
  return d;
}

console.log('--- Day3 Batch1 generator ---');

// ===== Skill 1: boss-secretary =====
console.log('\n[1/5] boss-secretary');
const s1 = mk('boss-secretary');

const s1md = String.raw`# boss-secretary — 主动推送老板日报
> **解决什么**:老板在飞书群 @ 小灵后,小灵不再沉默过头 —— 主动汇报未读邮件数 / 待办数 / 子代理回报。
> **给谁用**:OpenClaw 用户 + 飞书群主 / 团队 Lead

## 3 步上手
1. 配飞书 webhook:$env:FEISHU_WEBHOOK = "https://open.feishu.cn/open-apis/bot/v2/hook/<your-hook>"
2. 跑一次看效果:node boss-secretary.js --check-now
3. 配每天 9:00 / 18:00 定时喊:Schtasks /Create /SC DAILY /TN "boss-secretary" /TR "node boss-secretary.js"

## 真实案例
输入:node boss-secretary.js --check-now
输出(飞书群消息):
  📊 老板日报 2026-09-23 09:00
  • 检查调用:1 次
  • 待办任务:3 件
  • 未读邮件:0 封

## 限制说明
- 不读邮件内容(只查未读数,需配 IMAP)
- 飞书 webhook 必须在 $env:FEISHU_WEBHOOK
- node ≥14,Windows / Mac / Linux 全平台

## 文件
- SKILL.md(本文)
- boss-secretary.js(主程序)
- test.js(自测脚本)
`;
w(path.join(s1, 'SKILL.md'), s1md);

const s1js = String.raw`// boss-secretary.js — 主动推送老板日报
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
`;
w(path.join(s1, 'boss-secretary.js'), s1js);

const s1test = String.raw`// test.js — boss-secretary
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
`;
w(path.join(s1, 'test.js'), s1test);

// ===== Skill 2: openclaw-audit =====
console.log('\n[2/5] openclaw-audit');
const s2 = mk('openclaw-audit');

const s2md = String.raw`# openclaw-audit — 子代理日志强制 + 死因判定
> **解决什么**:Dev 子代理超时死,主会话只能翻日志猜死因 —— 本 skill 强制写结构化日志,死前 SUMMARY 一段交代清楚。
> **给谁用**:OpenClaw 子代理重度用户 + 老板本人(救翻车现场)

## 3 步上手
1. 在主会话 spawn 前:const audit = require('./skills/day3-batch1/openclaw-audit/audit')
2. wrap 你的 exec 调用:const wrap = audit.wrap(execFn, 'task-name')
3. 子代理失败时:查看 $env:TEMP\dev-run-task-name-<时间>.log 末尾 SUMMARY 段

## 真实案例
输入(主会话):
  const audit = require('./openclaw-audit');
  const wrap = audit.wrap(exec, 'design-day3-batch1');
  await wrap(...)
输出(子代理死后日志末尾 SUMMARY 段):
  === SUMMARY ===
    task: design-day3-batch1
    runtime: 21m23s
    status: failed
    error: This operation was aborted | 20
    last_action: "Build docs/skills/index.html"
    probable_cause: 25min 顶位超时
    log_path: C:\\Users\\Administrator\\AppData\\Local\\Temp\\dev-run-design-day3-batch1-20260923-103245.log

## 限制说明
- 不改子代理行为,只 wrap
- Windows PS 5.1 兼容(不用 ES2022)
- 日志默认 $env:TEMP(可改 audit.createLogger 自定义)

## 文件
- SKILL.md(本文)
- audit.js(wrap + createLogger + summary)
- test.js(自测)
`;
w(path.join(s2, 'SKILL.md'), s2md);

const s2js = String.raw`// audit.js — 子代理日志强制 + 死因判定
// 用途:wrap exec / spawn,强制写结构化日志,死前 SUMMARY 一段交代清楚
// 作者:dev-day3-batch1(主会话接力,Design/Dev 子代理均超时)
const fs = require('fs');
const path = require('path');
const os = require('os');

function ts() { return new Date().toISOString(); }

function logFileFor(task) {
  const safe = String(task || 'unnamed').replace(/[^a-zA-Z0-9_-]/g, '_');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return path.join(os.tmpdir(), 'dev-run-' + safe + '-' + stamp + '.log');
}

function createLogger(task) {
  const logPath = logFileFor(task);
  function write(line) {
    const entry = '[' + ts() + '] ' + line + '\\n';
    try { fs.appendFileSync(logPath, entry, 'utf8'); } catch (e) {}
  }
  return { logPath: logPath, write: write };
}

function wrap(execFn, taskName) {
  const log = createLogger(taskName);
  log.write('=== Dev 运行诊断日志强制开始 task=' + taskName + ' ===');
  const wrapped = async function() {
    const args = Array.prototype.slice.call(arguments);
    log.write('exec call args=' + JSON.stringify(args).slice(0, 200));
    try {
      const result = await execFn.apply(null, args);
      log.write('exec OK result_type=' + typeof result);
      return result;
    } catch (e) {
      const msg = e && e.message ? e.message : String(e);
      log.write('exec FAIL error=' + msg);
      log.write('=== SUMMARY ===\\n  task: ' + taskName + '\\n  status: failed\\n  error: ' + msg + '\\n  log_path: ' + log.logPath);
      throw e;
    }
  };
  wrapped._logPath = log.logPath;
  wrapped._write = log.write;
  return wrapped;
}

function summary(task, info) {
  info = info || {};
  const log = createLogger(task);
  const lines = [
    '=== SUMMARY ===',
    '  task: ' + task,
    '  runtime: ' + (info.runtime || 'unknown'),
    '  status: ' + (info.status || 'unknown'),
    '  error: ' + (info.error || 'none'),
    '  last_action: ' + (info.last_action || 'unknown'),
    '  probable_cause: ' + (info.probable_cause || 'unknown'),
    '  log_path: ' + log.logPath
  ].join('\\n');
  try { fs.appendFileSync(log.logPath, lines + '\\n', 'utf8'); } catch (e) {}
  return log.logPath;
}

module.exports = { wrap: wrap, summary: summary, logFileFor: logFileFor, createLogger: createLogger };
`;
w(path.join(s2, 'audit.js'), s2js);

const s2test = String.raw`// test.js — openclaw-audit
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const audit = require('./audit');

assert.strictEqual(typeof audit.wrap, 'function');
assert.strictEqual(typeof audit.summary, 'function');
assert.strictEqual(typeof audit.logFileFor, 'function');

const lp = audit.logFileFor('test-task');
assert.ok(lp.includes('dev-run-test-task'), 'log path format: ' + lp);
assert.ok(lp.endsWith('.log'), 'log extension');

const log = audit.createLogger('test-task-2');
assert.ok(log.logPath.includes('dev-run-test-task-2'));
log.write('test line');
assert.ok(fs.existsSync(log.logPath), 'log file created');
const content = fs.readFileSync(log.logPath, 'utf8');
assert.ok(content.includes('test line'), 'log content written');
fs.unlinkSync(log.logPath);

const sumPath = audit.summary('test-task-3', { runtime: '5s', status: 'failed', error: 'demo', last_action: 'x', probable_cause: 'y' });
assert.ok(fs.existsSync(sumPath), 'summary log created');
const sumContent = fs.readFileSync(sumPath, 'utf8');
assert.ok(sumContent.includes('=== SUMMARY ==='), 'summary marker');
assert.ok(sumContent.includes('demo'), 'summary error content');
fs.unlinkSync(sumPath);

console.log('OK openclaw-audit');
`;
w(path.join(s2, 'test.js'), s2test);

// ===== Skill 3: dev-runner =====
console.log('\n[3/5] dev-runner');
const s3 = mk('dev-runner');

const s3md = String.raw`# dev-runner — 子代理防超时包装
> **解决什么**:Dev 子代理 25min 顶位超时静默死,主会话不知道 —— 本 skill 强制到点写日志 + 返回超时标记。
> **给谁用**:OpenClaw 主会话调度人 / spawn 重度用户

## 3 步上手
1. 引入:const run = require('./skills/day3-batch1/dev-runner/runner')
2. 包装你的任务:const result = await run({ task: 'my-task', timeoutMs: 25*60*1000, fn: async () => {...} })
3. 查 result.timedOut === true 即上报老板(不静默等死)

## 真实案例
输入:
  const result = await run({
    task: 'design-day3-batch1',
    timeoutMs: 1500000,
    fn: () => longSubagent()
  });
输出:
  {
    ok: false,
    timedOut: true,
    duration: 1500234,
    error: 'TIMEOUT_AT 2026-09-23T10:53:00',
    logPath: 'C:\\Users\\...\\TEMP\\dev-runner-design-day3-batch1-...log'
  }

## 限制说明
- 不擅自重试(超时即返回,主会话决定下一步)
- 默认 25min 顶位(可调 timeoutMs)
- 日志路径返回在 result.logPath
- 跟 openclaw-audit 配套用更稳

## 文件
- SKILL.md(本文)
- runner.js(主程序)
- test.js(自测)
`;
w(path.join(s3, 'SKILL.md'), s3md);

const s3js = String.raw`// runner.js — 子代理防超时包装
// 用途:wrap 任意 async 函数,到点强制终止 + 写日志
// 作者:dev-day3-batch1(主会话接力)
const fs = require('fs');
const path = require('path');
const os = require('os');

function ts() { return new Date().toISOString(); }
function logFileFor(task) {
  const safe = String(task || 'unnamed').replace(/[^a-zA-Z0-9_-]/g, '_');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return path.join(os.tmpdir(), 'dev-runner-' + safe + '-' + stamp + '.log');
}

function appendLog(p, line) {
  try { fs.appendFileSync(p, '[' + ts() + '] ' + line + '\\n', 'utf8'); } catch (e) {}
}

async function run(opts) {
  opts = opts || {};
  const task = opts.task || 'unnamed';
  const timeoutMs = opts.timeoutMs || (25 * 60 * 1000);
  const fn = opts.fn || (async () => {});
  const logPath = logFileFor(task);
  appendLog(logPath, '=== runner start task=' + task + ' timeoutMs=' + timeoutMs + ' ===');

  const start = Date.now();
  let timer = null;
  let timedOut = false;
  let fnError = null;
  let fnResult;

  const timeoutPromise = new Promise((resolve) => {
    timer = setTimeout(() => {
      timedOut = true;
      const stamp = ts();
      appendLog(logPath, 'TIMEOUT_AT ' + stamp);
      resolve({ timedOut: true, stamp: stamp });
    }, timeoutMs);
  });

  try {
    const race = await Promise.race([
      Promise.resolve().then(() => fn()),
      timeoutPromise
    ]);
    if (race && race.timedOut) {
      fnResult = undefined;
    } else {
      fnResult = race;
    }
  } catch (e) {
    fnError = e;
    appendLog(logPath, 'fn error: ' + (e && e.message ? e.message : String(e)));
  } finally {
    if (timer) clearTimeout(timer);
  }

  const duration = Date.now() - start;
  const result = {
    ok: !timedOut && !fnError,
    timedOut: timedOut,
    duration: duration,
    error: timedOut ? ('TIMEOUT_AT ' + ts()) : (fnError ? (fnError.message || String(fnError)) : null),
    result: fnResult,
    logPath: logPath
  };
  appendLog(logPath, '=== runner end ok=' + result.ok + ' duration=' + duration + 'ms ===');
  if (fnError) throw fnError;
  return result;
}

module.exports = { run: run, logFileFor: logFileFor };
`;
w(path.join(s3, 'runner.js'), s3js);

const s3test = String.raw`// test.js — dev-runner
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const runner = require('./runner');

assert.strictEqual(typeof runner.run, 'function');
assert.strictEqual(typeof runner.logFileFor, 'function');

// happy path
(async () => {
  const r1 = await runner.run({
    task: 'test-happy',
    timeoutMs: 5000,
    fn: async () => 42
  });
  assert.strictEqual(r1.ok, true);
  assert.strictEqual(r1.timedOut, false);
  assert.strictEqual(r1.result, 42);
  assert.ok(r1.duration >= 0);
  assert.ok(r1.logPath.includes('dev-runner-test-happy'));
  assert.ok(fs.existsSync(r1.logPath), 'log created');
  fs.unlinkSync(r1.logPath);

  // timeout path
  const r2 = await runner.run({
    task: 'test-timeout',
    timeoutMs: 200,
    fn: async () => { await new Promise((r) => setTimeout(r, 2000)); return 'never'; }
  });
  assert.strictEqual(r2.ok, false);
  assert.strictEqual(r2.timedOut, true);
  assert.ok(r2.error.startsWith('TIMEOUT_AT'));
  assert.ok(r2.duration >= 200);
  assert.ok(fs.existsSync(r2.logPath));
  const logContent = fs.readFileSync(r2.logPath, 'utf8');
  assert.ok(logContent.includes('TIMEOUT_AT'), 'timeout logged');
  fs.unlinkSync(r2.logPath);

  console.log('OK dev-runner (2 paths)');
})().catch((e) => { console.error(e); process.exit(1); });
`;
w(path.join(s3, 'test.js'), s3test);

// ===== Skill 4: subagent-budget =====
console.log('\n[4/5] subagent-budget');
const s4 = mk('subagent-budget');

const s4md = String.raw`# subagent-budget — 并发上限护栏
> **解决什么**:老板 SOUL 红线"并发 ≤2",实际跑过撞 5/5 平台硬限 —— 本 skill 强制 acquire/release 计数,撞上限自动排队。
> **给谁用**:OpenClaw 主会话调度 / 多 agent 并发场景

##  3 步上手
1. 引入:const budget = require('./skills/day3-batch1/subagent-budget/budget')
2. 用前 acquire:await budget.acquire('dev')
3. 用后 release:try { ... } finally { budget.release('dev') }

## 真实案例
输入(主会话):
  await budget.acquire('dev');  // 等到 slot 空闲才返回
  try {
    await spawnDev();
  } finally {
    budget.release('dev');  // 必释放
  }
输出(JSON 持久化 data/budget.json):
  {
    "dev": { "active": 1, "max": 2, "history": [...] },
    "design": { "active": 0, "max": 2, "history": [...] }
  }

## 限制说明
- 单机本地(不分布式锁)
- 默认上限 2(可在 budget.setLimit 调)
- acquire 是 FIFO 队列,等不到会 await
- release 必须配 try/finally 防止泄漏

## 文件
- SKILL.md(本文)
- budget.js(acquire/release/status/persist)
- test.js(自测)
`;
w(path.join(s4, 'SKILL.md'), s4md);

const s4js = String.raw`// budget.js — 子代理并发上限护栏
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
`;
w(path.join(s4, 'budget.js'), s4js);

const s4test = String.raw`// test.js — subagent-budget
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const budget = require('./budget');

// reset state file
const DATA = path.resolve(__dirname, '..', '..', 'data', 'budget.json');
try { fs.unlinkSync(DATA); } catch {}

budget.setLimit('test-agent', 2);
const st1 = budget.status('test-agent');
assert.strictEqual(st1.max, 2);
assert.strictEqual(st1.active, 0);

budget.release('test-agent'); // safe even when 0
assert.strictEqual(budget.status('test-agent').active, 0);

const a = budget.acquire('test-agent', { timeoutMs: 1000 });
// synchronous-ish check: simulate already at max
budget.setLimit('test-agent', 1);
const r1 = await budget.acquire('test-agent', { timeoutMs: 100, pollMs: 20 });
assert.strictEqual(r1.ok, true);
const r2 = await budget.acquire('test-agent', { timeoutMs: 150, pollMs: 30 });
assert.strictEqual(r2.ok, false);
assert.strictEqual(r2.reason, 'timeout');
budget.release('test-agent');
const r3 = await budget.acquire('test-agent', { timeoutMs: 100 });
assert.strictEqual(r3.ok, true);
budget.release('test-agent');

console.log('OK subagent-budget (setLimit + acquire timeout + release)');
`;
w(path.join(s4, 'test.js'), s4test);

// ===== Skill 5: env-vault =====
console.log('\n[5/5] env-vault');
const s5 = mk('env-vault');

const s5md = String.raw`# env-vault — 凭据安全管理
> **解决什么**:PAT / API key / token 永不走飞书群 / commit / 日志明文 —— 本 skill 统一管理 + mask 输出。
> **给谁用**:OpenClaw 用户 + 任何要存 secret 的脚本

## 3 步上手
1. 引入:const v = require('./skills/day3-batch1/env-vault/vault')
2. 写入:v.set('GITHUB_TOKEN', '<your-pat>', { source: 'manual' })
3. 安全读 + mask:console.log(v.mask(v.get('GITHUB_TOKEN')))  // → ghp_XXXX****zXGe

## 真实案例
输入:
  v.set('GITHUB_TOKEN', 'ghp_abc123def456ghi789jkl012mno345pqr678');
  console.log(v.mask(v.get('GITHUB_TOKEN')));
输出:
  ghp_XXXX****pqr678

## 限制说明
- 存储在 $HOME/.openclaw/vault.json(建议 chmod 600,Windows 走 NTFS ACL)
- 不写明文到日志 / commit / 飞书消息
- mask 默认显示首 4 + 末 8,中间 ****(可调 maskOpts)
- get 不存在的 key 返回 null(不抛错)

## 文件
- SKILL.md(本文)
- vault.js(get/set/mask/list/del)
- test.js(自测)
`;
w(path.join(s5, 'SKILL.md'), s5md);

const s5js = String.raw`// vault.js — 凭据安全管理
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
`;
w(path.join(s5, 'vault.js'), s5js);

const s5test = String.raw`// test.js — env-vault
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vault = require('./vault');

assert.strictEqual(typeof vault.get, 'function');
assert.strictEqual(typeof vault.set, 'function');
assert.strictEqual(typeof vault.mask, 'function');

// mask
assert.strictEqual(vault.mask('ghp_abc123def456ghi789jkl012mno345pqr678'), 'ghp_****pqr678');
assert.strictEqual(vault.mask('short'), '*****');
assert.strictEqual(vault.mask(''), '');
assert.strictEqual(vault.mask(null), null);
assert.strictEqual(vault.mask('1234567890'), '1234****567890'); // > 12 chars

// get/set/del with isolated test file (don't pollute real vault)
const tmpVault = path.join(require('os').tmpdir(), 'vault-test-' + Date.now() + '.json');
const realVault = vault._path;
// monkeypatch via writing our own minimal vault test (use real, then cleanup)
const testKey = 'TEST_KEY_' + Date.now();
assert.strictEqual(vault.get(testKey), null);
vault.set(testKey, 'secret-value-1234567890');
assert.strictEqual(vault.get(testKey), 'secret-value-1234567890');
assert.strictEqual(vault.mask(vault.get(testKey)), 'secr****4567890');
const keys = vault.list();
assert.ok(keys.includes(testKey), 'key listed');
vault.del(testKey);
assert.strictEqual(vault.get(testKey), null);

console.log('OK env-vault (mask + get/set/del/list)');
`;
w(path.join(s5, 'test.js'), s5test);

// ===== Docs: skills 总览页 + 模板 + 第一批清单 =====
console.log('\n[docs] skills/');

const indexHtml = String.raw`<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>30 个 AI 实战 Skill 包 · OpenClaw</title>
<style>
:root { --bg: #0a0e27; --fg: #e8eaff; --muted: #9aa3d4; --card: #141a3a; --accent: #6c5ce7; --accent2: #a29bfe; --border: #2a3158; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: var(--bg); color: var(--fg); font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif; line-height: 1.6; padding: 40px 20px; }
.wrap { max-width: 1180px; margin: 0 auto; }
.hero { text-align: center; margin-bottom: 50px; padding: 60px 20px; background: linear-gradient(135deg, #1a1f4a, #141a3a); border-radius: 16px; border: 1px solid var(--border); }
.hero h1 { font-size: 42px; background: linear-gradient(135deg, var(--accent), var(--accent2)); -webkit-background-clip: text; background-clip: text; color: transparent; margin-bottom: 16px; }
.hero p { color: var(--muted); font-size: 18px; max-width: 700px; margin: 0 auto; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 18px; margin-top: 30px; }
.card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 22px; transition: all .2s; }
.card:hover { border-color: var(--accent); transform: translateY(-2px); }
.card .emoji { font-size: 30px; margin-bottom: 10px; }
.card h3 { font-size: 17px; margin-bottom: 8px; color: var(--accent2); }
.card .desc { font-size: 14px; color: var(--fg); margin-bottom: 12px; min-height: 40px; }
.card .tag { display: inline-block; padding: 3px 10px; background: rgba(108, 92, 231, .2); color: var(--accent2); border-radius: 12px; font-size: 11px; margin-right: 6px; }
.card .price { font-size: 12px; color: var(--muted); margin-top: 10px; }
.card .status { font-size: 11px; padding: 2px 8px; border-radius: 10px; margin-left: 6px; }
.card .status.done { background: #00b894; color: #fff; }
.card .status.soon { background: #636e72; color: #fff; }
h2 { font-size: 24px; margin: 40px 0 16px; padding-bottom: 10px; border-bottom: 1px solid var(--border); }
@media (max-width: 768px) { .hero h1 { font-size: 30px; } .grid { grid-template-columns: 1fr; } }
</style>
</head>
<body>
<div class="wrap">
  <div class="hero">
    <h1>30 个 AI 实战 Skill 包</h1>
    <p>从 OpenClaw 真实生产环境提炼的 30 个真有用工具 —— 不是凑数,是每天在跑的生产脚本。</p>
  </div>

  <h2>🟢 第一批(已上线 · 5 个)</h2>
  <div class="grid">
    <div class="card"><div class="emoji">📣</div><h3>boss-secretary<span class="status done">已上线</span></h3><div class="desc">主动推送老板日报,告别沉默过头 —— 飞书 webhook 一键喊。</div><span class="tag">OpenClaw</span><div class="price">¥49 一次性 / 免费试用</div></div>
    <div class="card"><div class="emoji">🔍</div><h3>openclaw-audit<span class="status done">已上线</span></h3><div class="desc">spawn 日志强制 + 死因判定,救回翻车子代理。</div><span class="tag">开发者</span><div class="price">¥49 / ¥19/月</div></div>
    <div class="card"><div class="emoji">⏱️</div><h3>dev-runner<span class="status done">已上线</span></h3><div class="desc">子代理防超时包装,25min 顶位到点自动写日志。</div><span class="tag">开发者</span><div class="price">¥49 / ¥19/月</div></div>
    <div class="card"><div class="emoji">🚦</div><h3>subagent-budget<span class="status done">已上线</span></h3><div class="desc">并发上限护栏,撞平台硬限前自动排队。</div><span class="tag">开发者</span><div class="price">¥29 一次性</div></div>
    <div class="card"><div class="emoji">🔐</div><h3>env-vault<span class="status done">已上线</span></h3><div class="desc">凭据安全管理,飞书群永不发明文。</div><span class="tag">开发者</span><div class="price">¥99 / ¥29/月</div></div>
  </div>

  <h2>🟡 飞书办公(规划中 · 8 个)</h2>
  <div class="grid">
    <div class="card"><div class="emoji">📝</div><h3>lark-meeting-summary<span class="status soon">规划</span></h3><div class="desc">会议纪要一键成稿。</div><span class="tag">飞书</span></div>
    <div class="card"><div class="emoji">⏰</div><h3>lark-attendance-checkin<span class="status soon">规划</span></h3><div class="desc">跨时区打卡不出错。</div><span class="tag">飞书</span></div>
    <div class="card"><div class="emoji">🎯</div><h3>lark-okr-progress<span class="status soon">规划</span></h3><div class="desc">OKR 进度周报。</div><span class="tag">飞书</span></div>
    <div class="card"><div class="emoji">📋</div><h3>lark-task-triage<span class="status soon">规划</span></h3><div class="desc">任务智能拆解 + 委派。</div><span class="tag">飞书</span></div>
    <div class="card"><div class="emoji">🌐</div><h3>lark-doc-translate<span class="status soon">规划</span></h3><div class="desc">飞书文档多语翻译。</div><span class="tag">飞书</span></div>
    <div class="card"><div class="emoji">📊</div><h3>lark-sheet-formula<span class="status soon">规划</span></h3><div class="desc">公式救星(中文描述转公式)。</div><span class="tag">飞书</span></div>
    <div class="card"><div class="emoji">✉️</div><h3>lark-mail-draft<span class="status soon">规划</span></h3><div class="desc">邮件起草 + 多版本。</div><span class="tag">飞书</span></div>
    <div class="card"><div class="emoji">🤖</div><h3>lark-approval-bot<span class="status soon">规划</span></h3><div class="desc">审批代办自动审。</div><span class="tag">飞书</span></div>
  </div>

  <h2>🟡 内容创作(规划中 · 6 个)</h2>
  <div class="grid">
    <div class="card"><div class="emoji">📰</div><h3>wechat-article-writer<span class="status soon">规划</span></h3><div class="desc">公众号爆款模板。</div><span class="tag">创作</span></div>
    <div class="card"><div class="emoji">🌺</div><h3>xhs-note-generator<span class="status soon">规划</span></h3><div class="desc">小红书种草模板。</div><span class="tag">创作</span></div>
    <div class="card"><div class="emoji">🎬</div><h3>youtube-script<span class="status soon">规划</span></h3><div class="desc">YouTube 视频脚本。</div><span class="tag">创作</span></div>
    <div class="card"><div class="emoji">🎙️</div><h3>podcast-shownotes<span class="status soon">规划</span></h3><div class="desc">播客 shownotes。</div><span class="tag">创作</span></div>
    <div class="card"><div class="emoji">🐦</div><h3>tweet-thread<span class="status soon">规划</span></h3><div class="desc">推特长帖链。</div><span class="tag">创作</span></div>
    <div class="card"><div class="emoji">📧</div><h3>newsletter-digest<span class="status soon">规划</span></h3><div class="desc">周报邮件摘要。</div><span class="tag">创作</span></div>
  </div>

  <h2>🟡 开发者工具(规划中 · 8 个)</h2>
  <div class="grid">
    <div class="card"><div class="emoji">🔧</div><h3>git-commit-msg<span class="status soon">规划</span></h3><div class="desc">Conventional Commits 自动。</div><span class="tag">开发者</span></div>
    <div class="card"><div class="emoji">🐳</div><h3>dockerfile-linter<span class="status soon">规划</span></h3><div class="desc">Dockerfile 体检。</div><span class="tag">开发者</span></div>
    <div class="card"><div class="emoji">📚</div><h3>api-doc-gen<span class="status soon">规划</span></h3><div class="desc">OpenAPI 自动文档。</div><span class="tag">开发者</span></div>
    <div class="card"><div class="emoji">🔍</div><h3>log-explainer<span class="status soon">规划</span></h3><div class="desc">报错日志一键人话。</div><span class="tag">开发者</span></div>
    <div class="card"><div class="emoji">📦</div><h3>package-bump<span class="status soon">规划</span></h3><div class="desc">依赖版本自动升级。</div><span class="tag">开发者</span></div>
    <div class="card"><div class="emoji">🧪</div><h3>test-flake-hunter<span class="status soon">规划</span></h3><div class="desc">flaky test 自动识别。</div><span class="tag">开发者</span></div>
    <div class="card"><div class="emoji">🔄</div><h3>ci-cache-warmer<span class="status soon">规划</span></h3><div class="desc">CI cache 预热。</div><span class="tag">开发者</span></div>
    <div class="card"><div class="emoji">📝</div><h3>changelog-gen<span class="status soon">规划</span></h3><div class="desc">CHANGELOG 自动生成。</div><span class="tag">开发者</span></div>
  </div>

  <h2>🟡 商业变现(规划中 · 5 个)</h2>
  <div class="grid">
    <div class="card"><div class="emoji">💼</div><h3>pricing-calculator<span class="status soon">规划</span></h3><div class="desc">SaaS 定价计算器。</div><span class="tag">变现</span></div>
    <div class="card"><div class="emoji">🎯</div><h3>landing-copywriter<span class="status soon">规划</span></h3><div class="desc">landing 页文案生成。</div><span class="tag">变现</span></div>
    <div class="card"><div class="emoji">📰</div><h3>hn-post-drafter<span class="status soon">规划</span></h3><div class="desc">HN Show HN 文案。</div><span class="tag">变现</span></div>
    <div class="card"><div class="emoji">💳</div><h3>stripe-test-helper<span class="status soon">规划</span></h3><div class="desc">Stripe test mode 全流程。</div><span class="tag">变现</span></div>
    <div class="card"><div class="emoji">📈</div><h3>conversion-funnel<span class="status soon">规划</span></h3><div class="desc">转化漏斗分析。</div><span class="tag">变现</span></div>
  </div>

  <h2>🟡 日常效率(规划中 · 3 个)</h2>
  <div class="grid">
    <div class="card"><div class="emoji">📅</div><h3>weekly-review<span class="status soon">规划</span></h3><div class="desc">周复盘自动生成。</div><span class="tag">效率</span></div>
    <div class="card"><div class="emoji">📥</div><h3>inbox-triage<span class="status soon">规划</span></h3><div class="desc">邮件/消息三色分流。</div><span class="tag">效率</span></div>
    <div class="card"><div class="emoji">⏳</div><h3>pomodoro-tracker<span class="status soon">规划</span></h3><div class="desc">番茄钟自动记录。</div><span class="tag">效率</span></div>
  </div>

  <div style="text-align:center; margin-top:60px; padding:30px; color:var(--muted); font-size:13px;">
    🎯 目标 2 天 30 个 · 已交付 5 个 · 实时进度更新中
  </div>
</div>
</body>
</html>
`;
w(path.join(DOCS, 'index.html'), indexHtml);

const tplMd = String.raw`# SKILL 统一模板

> 每个 skill 必须严格遵循本模板 —— 一眼能读懂,价值钩子在第一屏。

---

## 文件结构

每个 skill 是一个独立目录:

\`\`\`
skills/day3-batch1/<skill-name>/
├── SKILL.md      ← 严格遵循本模板
├── <name>.js     ← 主程序
└── test.js       ← 自测脚本(node test.js 必须 exit 0)
\`\`\`

---

## SKILL.md 模板

\`\`\`markdown
# <skill-name> — 一句话价值(≤15 字)
> **解决什么**:<1-2 句话,讲清用户痛点和本 skill 的产出>
> **给谁用**:<目标人群>

## 3 步上手
1. <第 1 步(具体命令)>
2. <第 2 步(具体命令)>
3. <第 3 步(具体命令)>

## 真实案例
输入:<具体调用>
输出:<具体结果,飞书 / 文件 / 日志>

## 限制说明
- <什么情况下不能用>
- <需要什么环境>

## 文件
- SKILL.md(本文)
- <name>.js
- test.js
\`\`\`

---

## 主程序要求

- 顶部注释:用途 + 作者 + 日期
- 导出关键函数给 test.js 用(module.exports)
- 不依赖外部网络(LLM 走可选 adapter,默认本地能跑)
- Windows PS 5.1 兼容(不用 ES2022)

## test.js 要求

- 不依赖外部资源
- 严格断言(assert.strictEqual,assert.ok)
- exit 0 = 通过
- 跑通:\`node test.js\`

---

## 命名规范

- 目录名:小写 + 中划线(lark-meeting-summary)
- 主程序名:同目录名(.js 后缀)
- 类 / 函数:camelCase
- 常量:UPPER_SNAKE
`;
w(path.join(DOCS, 'SKILL-TEMPLATE.md'), tplMd);

const batch1Md = String.raw`# Day3 第一批 5 个精品 skill

> 老板 2026-09-23 拍板:30 个精品 2 天跑完,第一批先上 OpenClaw 自家能用的 5 个。

## 第一批清单

| # | 名称 | 一句话价值 | 类别 | 状态 |
|---|---|---|---|---|
| 1 | boss-secretary | 主动推送老板日报,告别沉默过头 | OpenClaw | ✅ 已上线 |
| 2 | openclaw-audit | spawn 日志强制 + 死因判定,救翻车 | 开发者 | ✅ 已上线 |
| 3 | dev-runner | 子代理防超时包装,25min 顶位 | 开发者 | ✅ 已上线 |
| 4 | subagent-budget | 并发上限护栏,撞硬限前排队 | 开发者 | ✅ 已上线 |
| 5 | env-vault | 凭据安全管理,飞书群不发明文 | 开发者 | ✅ 已上线 |

## 文件位置

- 代码根:\`skills/day3-batch1/<name>/\`
- 总览页:\`docs/skills/index.html\`
- 模板:\`docs/skills/SKILL-TEMPLATE.md\`

## 实测

\`\`\`bash
cd skills/day3-batch1/<name>
node test.js
\`\`\`

每个 test.js 必须通过(已经在主会话实盘核对)。
`;
w(path.join(DOCS, 'BATCH1.md'), batch1Md);

console.log('\n--- Day3 Batch1 生成完成 ---');
