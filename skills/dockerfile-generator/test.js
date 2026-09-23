// test.js — dockerfile-generator 自测(纯字符串拼接,不联网)
// 测:1)默认生成 2)多阶段 3)自定义 base/port/entrypoint 4)输入校验 5)cli 跑通

'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { generate, writeOut } = require('./index');

const HERE = __dirname;

(async () => {
  // 1) 默认(单阶段)
  const t = generate({});
  assert.ok(t.content.includes('FROM node:24-alpine'));
  assert.ok(t.content.includes('WORKDIR /app'));
  assert.ok(t.content.includes('EXPOSE 3000'));
  assert.ok(t.content.includes('node server.js'));
  assert.ok(t.lines > 5);

  // 2) 多阶段
  const m = generate({ multi_stage: true });
  assert.ok(m.content.includes('AS builder'));
  assert.ok(m.content.includes('COPY --from=builder'));
  assert.ok(m.lines > 10);

  // 3) 自定义
  const c = generate({ base_image: 'node:20-alpine', port: '8080', entrypoint: 'node dist/main.js', workdir: '/srv' });
  assert.ok(c.content.includes('FROM node:20-alpine'));
  assert.ok(c.content.includes('EXPOSE 8080'));
  assert.ok(c.content.includes('WORKDIR /srv'));
  assert.ok(c.content.includes('node dist/main.js'));

  // 4) node_version 兜底
  const n = generate({ node_version: '22' });
  assert.ok(n.content.includes('FROM node:22-alpine'));

  // 5) 校验失败
  assert.throws(() => generate({ base_image: 'bad; image' }), /bad base_image/);
  assert.throws(() => generate({ port: 'abc' }), /bad port/);
  assert.throws(() => generate({ workdir: 'no-leading-slash' }), /bad workdir/);
  assert.throws(() => generate({ entrypoint: 'a\nb' }), /entrypoint contains newline/);

  // 6) writeOut 落盘
  const out = writeOut(t.content, HERE, false);
  assert.ok(fs.existsSync(out.dockerfile));
  const saved = fs.readFileSync(out.dockerfile, 'utf8');
  assert.strictEqual(saved, t.content);
  // 清理
  fs.unlinkSync(out.dockerfile);

  // 7) CLI 跑通
  const { execFileSync } = require('child_process');
  const idx = path.join(HERE, 'index.js');
  const stdout = execFileSync(process.execPath, [idx, '--stdout-only', '--port', '3737', '--multi-stage'], { encoding: 'utf8' }).trim();
  const cli = JSON.parse(stdout);
  assert.ok(cli.content.includes('EXPOSE 3737'));
  assert.ok(cli.content.includes('AS builder'));

  console.log('OK dockerfile-generator (template + validate + cli)');
})().catch((e) => { console.error('[FAIL]', e.message); process.exit(1); });
