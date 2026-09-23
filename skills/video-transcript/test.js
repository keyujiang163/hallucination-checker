// test.js — video-transcript 自测(纯本地,零网络)
// 测:1)mock 输出  2)解析 srt  3)解析 vtt  4)解析 txt  5)url-stub  6)max_chars 裁剪  7)cli 跑通

'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { makeTranscript, parseSrt, parseVtt } = require('./index');

(async () => {
  // 1) mock
  const m = await makeTranscript({ mock: true });
  assert.strictEqual(m.source, 'mock');
  assert.strictEqual(m.status, 'ok');
  assert.ok(m.transcript.includes('AI skill') || m.transcript.includes('AI'));

  // 2) mock lang=en
  const en = await makeTranscript({ mock: true, lang: 'en' });
  assert.ok(en.transcript.includes('three lessons') || en.transcript.includes('templates'));
  assert.strictEqual(en.lang, 'en');

  // 3) srt 解析(写入临时文件)
  const srt = '1\n00:00:00,000 --> 00:00:02,500\n你好世界\n\n2\n00:00:02,500 --> 00:00:05,000\n第二行字幕\n';
  const srtPath = path.join(os.tmpdir(), 'vt_' + Date.now() + '.srt');
  fs.writeFileSync(srtPath, srt, 'utf8');
  const srtR = await makeTranscript({ path: srtPath });
  assert.strictEqual(srtR.source, 'local:srt');
  assert.ok(srtR.transcript.includes('你好世界'));
  assert.ok(srtR.transcript.includes('第二行字幕'));
  // 直接 parser 验证
  const segs = parseSrt(srt);
  assert.strictEqual(segs.length, 2);
  assert.ok(Math.abs(segs[0].start - 0) < 1e-6);
  assert.ok(Math.abs(segs[1].end - 5.0) < 1e-6);

  // 4) vtt 解析
  const vtt = 'WEBVTT\n\n00:00:01.000 --> 00:00:03.000\nVTT 中文\n\n00:00:03.500 --> 00:00:06.500\nVTT 第二段\n';
  const vttPath = path.join(os.tmpdir(), 'vt_' + Date.now() + '.vtt');
  fs.writeFileSync(vttPath, vtt, 'utf8');
  const vttR = await makeTranscript({ path: vttPath });
  assert.strictEqual(vttR.source, 'local:vtt');
  assert.ok(vttR.transcript.includes('VTT 中文'));
  assert.ok(parseVtt(vtt).length === 2);

  // 5) txt 解析
  const txtPath = path.join(os.tmpdir(), 'vt_' + Date.now() + '.txt');
  fs.writeFileSync(txtPath, '纯文本字幕\n再来一行\n', 'utf8');
  const txtR = await makeTranscript({ path: txtPath });
  assert.strictEqual(txtR.source, 'local:txt');
  assert.ok(txtR.transcript.includes('纯文本字幕'));

  // 6) url-stub(不下载)
  const u = await makeTranscript({ url: 'https://example.com/video/abc', lang: 'zh' });
  assert.strictEqual(u.source, 'url-stub');
  assert.ok(u.transcript.includes('example.com'));

  // 7) max_chars 裁剪
  const big = await makeTranscript({ mock: true, max_chars: 5 });
  assert.ok(big.char_count <= 8, 'should be truncated, got ' + big.char_count);
  assert.ok(big.transcript.endsWith('...') || big.transcript.length <= 8);

  // 8) format=segments
  const seg = await makeTranscript({ path: srtPath, format: 'segments' });
  assert.ok(Array.isArray(seg.segments));
  assert.strictEqual(seg.segments.length, 2);

  // 9) CLI 跑通(mock)
  const { execFileSync } = require('child_process');
  const out = execFileSync(process.execPath, [
    path.join(__dirname, 'index.js'), '--mock', '--lang', 'zh',
  ], { encoding: 'utf8' });
  const cli = JSON.parse(out);
  assert.strictEqual(cli.source, 'mock');
  assert.ok(cli.transcript.length > 0);

  // 清理
  try { fs.unlinkSync(srtPath); } catch (_) {}
  try { fs.unlinkSync(vttPath); } catch (_) {}
  try { fs.unlinkSync(txtPath); } catch (_) {}

  console.log('OK video-transcript (mock + srt + vtt + txt + url-stub + max_chars + cli)');
})().catch((e) => { console.error('[FAIL]', e.message); process.exit(1); });
