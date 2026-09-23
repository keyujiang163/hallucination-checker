// index.js — git 提交助手(只在 D:\projects\ai-hallucination-checker 内跑)
// 输入:{message, type?='feat', files?=null, no_add?=false}
// 输出:{commit_hash, files_count, status}
// 红线:不 push,只在 ROOT 仓跑

'use strict';

const { execFileSync, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = 'D:\\projects\\ai-hallucination-checker';
const MAX_FILES = 200;
const VALID_TYPES = ['feat', 'fix', 'docs', 'chore', 'refactor', 'test', 'perf', 'style'];

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

function gitRootOrNull(cwd) {
  try {
    const r = execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd, encoding: 'utf8', timeout: 5000 }).trim();
    return r;
  } catch (_) { return null; }
}

function statusShort(cwd) {
  try {
    return execFileSync('git', ['status', '--short'], { cwd, encoding: 'utf8', timeout: 5000 });
  } catch (e) {
    return '';
  }
}

function commit({ message, type = 'feat', files = null, no_add = false }) {
  if (!message || !message.trim()) throw new Error('REPORT_TO_BOSS: message required');
  if (!VALID_TYPES.includes(type)) throw new Error('REPORT_TO_BOSS: bad type ' + type);

  const cwd = process.cwd();
  const root = gitRootOrNull(cwd);
  if (!root) {
    return { status: 'error', error: 'not a git repo', cwd };
  }
  // 硬边界:只在 ROOT 仓跑(测试可设 GIT_COMMIT_HELPER_ALLOW_ANY_REPO=1 旁路)
  const normRoot = root.replace(/\\/g, '/').toLowerCase();
  const normTarget = ROOT.replace(/\\/g, '/').toLowerCase();
  const allowAny = process.env.GIT_COMMIT_HELPER_ALLOW_ANY_REPO === '1';
  if (!allowAny && normRoot !== normTarget) {
    return { status: 'error', error: 'not in ROOT ' + ROOT, root };
  }

  // 文件数上限
  let fileList = files;
  if (!fileList && !no_add) {
    const st = statusShort(cwd);
    fileList = st.split('\n').filter((l) => l.trim()).map((l) => l.slice(3).trim());
  }
  if (!fileList || fileList.length === 0) {
    return { commit_hash: null, files_count: 0, status: 'noop' };
  }
  if (fileList.length > MAX_FILES) {
    return { status: 'error', error: 'too many files ' + fileList.length, max: MAX_FILES };
  }

  // add
  if (!no_add) {
    try {
      execFileSync('git', ['add', '--'].concat(fileList), { cwd, encoding: 'utf8', timeout: 10000 });
    } catch (e) {
      return { status: 'error', error: 'git add failed', detail: (e.stderr || e.message || '').toString().split('\n')[0] };
    }
  }

  // commit
  const subject = type + ': ' + message.trim();
  try {
    execFileSync('git', ['commit', '-m', subject, '--no-verify'], { cwd, encoding: 'utf8', timeout: 15000 });
  } catch (e) {
    return { status: 'error', error: 'git commit failed', detail: (e.stderr || e.message || '').toString().split('\n')[0] };
  }

  const hash = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd, encoding: 'utf8' }).trim();
  return { commit_hash: hash, files_count: fileList.length, status: 'ok' };
}

module.exports = { commit, ROOT };

if (require.main === module) {
  (async () => {
    const args = parseArgs(process.argv);
    try {
      const out = commit({
        message: args.message,
        type: typeof args.type === 'string' ? args.type : 'feat',
        files: typeof args.files === 'string' ? args.files.split(/\s+/) : null,
        no_add: !!args['no-add'],
      });
      console.log(JSON.stringify(out));
      if (out.status === 'error') process.exit(1);
    } catch (e) {
      console.error('[FAIL]', e.message);
      process.exit(1);
    }
  })();
}
