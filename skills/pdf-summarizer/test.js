// test.js — pdf-summarizer 自测(造纯文本 PDF-like 字节)
// 测:1)本地 PDF 抽取 + 摘要  2)非 PDF 报错  3)CLI 跑通  4)key_count

'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { pdfSummarize, extractTextFromPdf } = require('./index');

(async () => {
  // 1) 造一个最简 PDF-like 字节(含 %PDF- 头 + 流式文本)
  const tmp = path.join(os.tmpdir(), 'pdf-test-' + Date.now() + '.pdf');
  // 注入 3 段 Tj 文本
  const pdfBytes = Buffer.concat([
    Buffer.from('%PDF-1.4\n'),
    Buffer.from('BT /F1 12 Tf 100 700 Td (Hello world this is a test PDF document) Tj ET\n'),
    Buffer.from('BT /F1 12 Tf 100 680 Td (Second sentence about AI agents and tooling.) Tj ET\n'),
    Buffer.from('BT /F1 12 Tf 100 660 Td (Third key point about automation.) Tj ET\n'),
    Buffer.from('%%EOF'),
  ]);
  fs.writeFileSync(tmp, pdfBytes);

  const out = await pdfSummarize({ source: tmp, sourceType: 'path', max_chars: 500, key_count: 3 });
  assert.ok(out.char_count > 0, 'char_count > 0');
  assert.ok(out.summary.includes('Hello'), 'summary contains text');
  assert.ok(out.key_points.length > 0, 'key_points > 0');
  assert.ok(out.key_points.length <= 3, 'key_points cap');

  // 2) 非 PDF 字节
  const tmp2 = path.join(os.tmpdir(), 'pdf-test2-' + Date.now() + '.bin');
  fs.writeFileSync(tmp2, Buffer.from('hello world not pdf'));
  try {
    const out2 = await pdfSummarize({ source: tmp2, sourceType: 'path' });
    assert.strictEqual(out2.char_count, 0);
    assert.ok(out2.note, 'has note for non-pdf');
  } catch (e) {
    // 也可接受直接报错
    assert.ok(/not a pdf|REPORT_TO_BOSS/.test(e.message));
  }

  // 3) CLI 跑通
  const { execFileSync } = require('child_process');
  const cliOut = execFileSync(process.execPath, ['index.js', '--path', tmp, '--max', '300', '--key-count', '2'], { encoding: 'utf8' }).trim();
  const cli = JSON.parse(cliOut);
  assert.ok(cli.char_count > 0, 'cli summary');
  assert.ok(cli.key_points.length <= 2);

  // 4) 缺 source 报错
  await assert.rejects(() => pdfSummarize({}), /--path or --url/);

  // 5) cleanup
  [tmp, tmp2].forEach((f) => { try { fs.unlinkSync(f); } catch (_) {} });

  console.log('OK pdf-summarizer (extract + summary + non-pdf + cli + validate)');
})().catch((e) => { console.error('[FAIL]', e.message); process.exit(1); });
