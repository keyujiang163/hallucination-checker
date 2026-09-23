// test.js — github-action-template 自测(纯字符串拼接,不联网)
// 测:1)单 job 2)多 job 3)schedule trigger 4)输入校验 5)cli 跑通

'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { generate, writeOut, parseSpec } = require('./index');

const HERE = __dirname;

(async () => {
  // 1) 单 job
  const t = generate({
    name: 'ci',
    triggers: ['push'],
    jobs: [{
      id: 'build',
      runs_on: 'ubuntu-latest',
      steps: [
        { name: 'checkout', uses: 'actions/checkout@v4' },
        { name: 'setup-node', uses: 'actions/setup-node@v4', with: { 'node-version': '24' } },
        { name: 'run tests', run: 'npm test' },
      ],
    }],
  });
  assert.ok(t.content.includes('name: ci'));
  assert.ok(t.content.includes('on:'));
  assert.ok(t.content.includes('  push:'));
  assert.ok(t.content.includes('jobs:'));
  assert.ok(t.content.includes('  build:'));
  assert.ok(t.content.includes('runs-on: ubuntu-latest'));
  assert.ok(t.content.includes('uses: actions/checkout@v4'));
  assert.ok(/run: ("npm test"|npm test)/.test(t.content));
  assert.ok(/node-version: ("24"|24|'24')/.test(t.content));

  // 2) 多 job + needs
  const m = generate({
    name: 'release',
    triggers: ['push', 'pull_request'],
    jobs: [
      { id: 'lint', runs_on: 'ubuntu-latest', steps: [{ name: 'lint', run: 'npm run lint' }] },
      { id: 'test', runs_on: 'ubuntu-latest', needs: 'lint', steps: [{ name: 'test', run: 'npm test' }] },
    ],
  });
  assert.ok(m.content.includes('  lint:'));
  assert.ok(m.content.includes('  test:'));
  assert.ok(m.content.includes('needs: lint'));
  assert.ok(m.content.includes('  pull_request:'));

  // 3) schedule trigger
  const s = generate({
    name: 'nightly',
    triggers: [{ type: 'schedule', cron: '0 2 * * *' }],
    jobs: [{ id: 'job', steps: [{ name: 'run', run: 'echo hi' }] }],
  });
  assert.ok(s.content.includes('schedule:'));
  assert.ok(s.content.includes('cron: "0 2 * * *"'));

  // 4) 校验失败
  assert.throws(() => generate({ name: '', triggers: ['push'], jobs: [{ id: 'a', steps: [] }] }), /name required/);
  assert.throws(() => generate({ name: 'bad name', triggers: ['push'], jobs: [{ id: 'a', steps: [] }] }), /bad name/);
  assert.throws(() => generate({ name: 'x', triggers: [], jobs: [{ id: 'a', steps: [] }] }), /triggers required/);
  assert.throws(() => generate({ name: 'x', triggers: ['bad'], jobs: [{ id: 'a', steps: [] }] }), /bad trigger/);
  assert.throws(() => generate({ name: 'x', triggers: ['push'], jobs: [] }), /jobs required/);

  // 5) parseSpec 辅助
  const ps = parseSpec('id:foo;runs-on:ubuntu-latest;needs:lint');
  assert.strictEqual(ps.id, 'foo');
  assert.strictEqual(ps['runs-on'], 'ubuntu-latest');
  assert.strictEqual(ps.needs, 'lint');

  // 6) writeOut 落盘
  const out = writeOut(t.content, HERE, 'ci', false);
  assert.ok(fs.existsSync(out.yaml));
  const saved = fs.readFileSync(out.yaml, 'utf8');
  assert.strictEqual(saved, t.content);
  fs.unlinkSync(out.yaml);

  // 7) CLI 跑通
  const { execFileSync } = require('child_process');
  const idx = path.join(HERE, 'index.js');
  const stdout = execFileSync(process.execPath, [
    idx, '--name', 'cli-ci',
    '--triggers', 'push,pull_request',
    '--job', 'id:build;runs-on:ubuntu-latest',
    '--step', 'id:checkout;uses:actions/checkout@v4',
    '--stdout-only',
  ], { encoding: 'utf8' }).trim();
  const cli = JSON.parse(stdout);
  assert.ok(cli.content.includes('name: cli-ci'));
  assert.ok(cli.content.includes('  build:'));
  assert.ok(cli.content.includes('uses: actions/checkout@v4'));
  // 清理落盘的 yml(若已存在)
  const ymlPath = path.join(HERE, 'cli-ci.yml');
  if (fs.existsSync(ymlPath)) fs.unlinkSync(ymlPath);

  console.log('OK github-action-template (template + validate + cli)');
})().catch((e) => { console.error('[FAIL]', e.message); process.exit(1); });
