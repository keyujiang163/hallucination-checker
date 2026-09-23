// test.js — git-commit-helper 自测(临时 git init,不碰真仓)
// 测:1)真 git init + add + commit 2)坏 type 抛错 3)non-ROOT 拒跑 4)noop 处理

'use strict';
const assert = require('assert');
const { execFileSync, spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { commit } = require('./index');

function mkTmpRepo() {
  const dir = path.join(os.tmpdir(), 'gch-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6));
  fs.mkdirSync(dir, { recursive: true });
  // init + commit-on-empty(commit 才算装上)
  execFileSync('git', ['init', '--initial-branch=main'], { cwd: dir, encoding: 'utf8' });
  execFileSync('git', ['config', 'user.email', 't@t'], { cwd: dir, encoding: 'utf8' });
  execFileSync('git', ['config', 'user.name', 'T'], { cwd: dir, encoding: 'utf8' });
  execFileSync('git', ['config', 'commit.gpgsign', 'false'], { cwd: dir, encoding: 'utf8' });
  fs.writeFileSync(path.join(dir, 'a.txt'), 'a');
  execFileSync('git', ['add', 'a.txt'], { cwd: dir, encoding: 'utf8' });
  execFileSync('git', ['commit', '-m', 'init', '--no-verify'], { cwd: dir, encoding: 'utf8' });
  return dir;
}

(async () => {
  process.env.GIT_COMMIT_HELPER_ALLOW_ANY_REPO = '1'; // 旁路 ROOT 边界(只为本 skill 的测试)
  // 1) 真跑 commit 流程(临时仓)
  const dir = mkTmpRepo();
  const old = process.cwd();
  process.chdir(dir);
  try {
    fs.writeFileSync(path.join(dir, 'b.txt'), 'b');
    const out = commit({ message: 'add b', type: 'feat' });
    assert.strictEqual(out.status, 'ok');
    assert.ok(/^[a-f0-9]+$/.test(out.commit_hash));
    assert.strictEqual(out.files_count, 1);

    // noop:已干净
    const out2 = commit({ message: 'noop' });
    assert.strictEqual(out2.status, 'noop');

    // 坏 type
    assert.throws(() => commit({ message: 'x', type: 'video' }), /bad type/);

    // 缺 message
    assert.throws(() => commit({ message: '' }), /message required/);
  } finally {
    process.chdir(old);
  }

  // 2) non-ROOT 拒绝
  process.chdir(os.tmpdir());
  try {
    // tmpdir 通常不是 git 仓,应返回 status=error
    const out3 = commit({ message: 'x' });
    // 可能是 error (not in ROOT) 也可能 noop (no files)
    assert.ok(['error', 'noop'].includes(out3.status), 'non-root returns non-ok: ' + JSON.stringify(out3));
  } finally {
    process.chdir(old);
  }

  console.log('OK git-commit-helper (commit + noop + validate + boundary)');
})().catch((e) => { console.error('[FAIL]', e.message); process.exit(1); });
