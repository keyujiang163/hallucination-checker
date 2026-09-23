// audit.js — 子代理日志强制 + 死因判定
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
