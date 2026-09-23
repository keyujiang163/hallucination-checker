// runner.js — 子代理防超时包装
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
