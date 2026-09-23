// test.js — xhs-poster 自测(隔离测试 memory/ 目录)
// 测:1)title 必填  2)tags 必填  3)写 memory 落盘  4)CLI 跑通

'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

// 隔离测试:临时改 ROOT 行为(直接调 post(),自己控制 memoryDir)
const { post } = require('./index');

(async () => {
  // 1) 缺 title
  await assert.rejects(() => post({ title: '', tags: ['a'] }), /title required/);

  // 2) 缺 tags
  await assert.rejects(() => post({ title: 't', tags: [] }), /tags required/);

  // 3) tags 字符串形式(逗号)。ROOT 环境下 marketing-ops 会返回 queued,无 ROOT 时降 mock。
  const r = await post({ title: '测试笔记', tags: 'AI,skill', time_slot: 'morning' });
  assert.ok(['mock', 'queued'].includes(r.status), 'status: ' + r.status);
  assert.ok(/^mock_[a-z0-9]+$/.test(r.post_id));
  assert.ok(r.queue_file.endsWith('-posts.md'), 'queue_file name');
  assert.deepStrictEqual(r.tags.sort(), ['AI', 'skill'].sort());

  // 4) 落盘文件存在 + 内容含 title
  assert.ok(fs.existsSync(r.queue_file), 'queue file exists');
  const content = fs.readFileSync(r.queue_file, 'utf8');
  assert.ok(content.includes('测试笔记'));
  assert.ok(content.includes('AI,skill'));

  // 5) CLI 跑通(marketing-ops 会先打 [POST][DRY] 一行,所以 cliOut 混两行,提取 JSON 段)
  const { execFileSync } = require('child_process');
  const cliOut = execFileSync(process.execPath, ['index.js', '--title', 'CLI笔记', '--tags', 'ai,cli', '--time-slot', 'evening'], { encoding: 'utf8' }).trim();
  // 抽最后一行的 { ... } JSON
  const jsonLine = cliOut.split(/\r?\n/).reverse().find((l) => l.startsWith('{') && l.endsWith('}'));
  assert.ok(jsonLine, 'cli produced JSON line; full output=' + cliOut);
  const cli = JSON.parse(jsonLine);
  assert.ok(cli.post_id);
  assert.ok(['mock', 'queued'].includes(cli.status));

  // cleanup
  try { fs.unlinkSync(r.queue_file); } catch (_) {}

  console.log('OK xhs-poster (validate + memory write + cli)');
})().catch((e) => { console.error('[FAIL]', e.message); process.exit(1); });
