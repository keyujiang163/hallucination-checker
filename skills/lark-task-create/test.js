// test.js — lark-task-create 自测(mock 模式,不联网)
// 测:1)mock 返回 fake_id 2)空 title 抛错 3)cli 跑通

'use strict';
const assert = require('assert');
const path = require('path');
const { create } = require('./index');

(async () => {
  delete process.env.FEISHU_BOT_TOKEN;
  delete process.env.ALLOW_LIVE;

  const m = await create({ title: '做 X' });
  assert.strictEqual(m.status, 'mock');
  assert.ok(/^mock_task_[a-z0-9]+$/.test(m.task_id), 'mock id shape: ' + m.task_id);
  assert.ok(m.url.startsWith('https://feishu.cn/task/'));

  await assert.rejects(() => create({ title: '' }), /title required/);
  await assert.rejects(() => create({ title: '   ' }), /title required/);
  await assert.rejects(() => create({}), /title required/);

  const { execFileSync } = require('child_process');
  const idx = path.join(__dirname, 'index.js');
  const out = execFileSync(process.execPath, [idx, '--title', 'CLI 测'], { encoding: 'utf8' }).trim();
  const cli = JSON.parse(out);
  assert.strictEqual(cli.status, 'mock');
  assert.ok(cli.task_id);

  console.log('OK lark-task-create (mock + validate + cli)');
})().catch((e) => { console.error('[FAIL]', e.message); process.exit(1); });
