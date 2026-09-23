// test.js — markdown-to-feishu 自测(mock 模式,不联网)

'use strict';
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { create, mdToBlocks, mdLineToBlock } = require('./index');

(async () => {
  delete process.env.FEISHU_BOT_TOKEN;
  delete process.env.ALLOW_LIVE;

  // 1) 块转换
  const blocks = mdToBlocks('# Title\n## section\n- item1\n- item2\n**bold** text\nplain');
  assert.strictEqual(blocks.length, 6);
  assert.strictEqual(blocks[0].block_type, 3); // heading1
  assert.strictEqual(blocks[1].block_type, 4); // heading2
  assert.strictEqual(blocks[2].block_type, 12); // bullet
  assert.strictEqual(blocks[4].block_type, 2); // text w/ bold
  assert.ok(blocks[4].text.elements.some((e) => e.text_run.text_element_style && e.text_run.text_element_style.bold));

  // 2) md_text → mock
  const m = await create({ md_text: '## a\n- b' });
  assert.strictEqual(m.status, 'mock');
  assert.ok(/^mock_doc_[a-z0-9]+$/.test(m.doc_token));
  assert.strictEqual(m.blocks_count, 2);

  // 3) file_path → mock
  const tmp = path.join(os.tmpdir(), 'm2f-test-' + Date.now() + '.md');
  fs.writeFileSync(tmp, '# X\n## Y\n- z', 'utf8');
  const f = await create({ file_path: tmp });
  assert.strictEqual(f.status, 'mock');
  assert.strictEqual(f.blocks_count, 3);
  fs.unlinkSync(tmp);

  // 4) 校验
  await assert.rejects(async () => create({}), /md_text or file_path required/);
  await assert.rejects(async () => create({ md_text: '' }), /md_text or file_path required/);

  // 5) CLI
  const { execFileSync } = require('child_process');
  const idx = path.join(__dirname, 'index.js');
  const tmp2 = path.join(os.tmpdir(), 'm2f-cli-' + Date.now() + '.md');
  fs.writeFileSync(tmp2, '## cli\n- x', 'utf8');
  const out = execFileSync(process.execPath, [idx, '--file', tmp2], { encoding: 'utf8' }).trim();
  const cli = JSON.parse(out);
  assert.strictEqual(cli.status, 'mock');
  assert.strictEqual(cli.blocks_count, 2);
  fs.unlinkSync(tmp2);

  console.log('OK markdown-to-feishu (mock + md2blocks + cli)');
})().catch((e) => { console.error('[FAIL]', e.message); process.exit(1); });
