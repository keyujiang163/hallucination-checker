// index.js — 视频/字幕文本提炼(纯本地解析,零 LLM/零网络)
// 输入:{path?, mock?, url?, lang?, format?, max_chars?}
// 输出:{transcript, segments, lang, source, char_count, status}
// 红线:不调任何 LLM/whisper/在线转写 API

'use strict';

const fs = require('fs');
const path = require('path');

const MOCK_ZH = '大家好，今天我们分享 AI skill 落地的三条经验。第一，模板优先，不要先调 LLM；第二，凭据走环境变量，代码无明文；第三，每个 skill 必须有 test.js 通过才算交付。完。';

const MOCK_EN = 'Today we share three lessons for shipping AI skills. First, templates over LLM calls. Second, credentials only via env vars. Third, every skill ships with a passing test. That is all.';

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

function toBool(v) { return v === true || v === 'true' || v === '1'; }

function ts2sec(t) {
  // 00:00:03,500  or  00:00:03.500
  const m = String(t).trim().match(/^(?:(\d+):)?(\d+):(\d+)[,.](\d+)$/);
  if (!m) return 0;
  const h = Number(m[1] || 0);
  const mi = Number(m[2]);
  const se = Number(m[3]);
  const ms = Number(m[4]);
  return h * 3600 + mi * 60 + se + ms / 1000;
}

function parseSrt(text) {
  const blocks = text.replace(/\r\n/g, '\n').split(/\n\s*\n/);
  const segs = [];
  for (const blk of blocks) {
    const lines = blk.split('\n').filter((l) => l.length > 0);
    if (lines.length < 2) continue;
    let i = 0;
    if (/^\d+$/.test(lines[0].trim())) i = 1; // skip index line
    const time = lines[i];
    const body = lines.slice(i + 1).join(' ').trim();
    if (!body) continue;
    const m = time.match(/(\S+)\s*-->\s*(\S+)/);
    if (!m) { segs.push({ start: 0, end: 0, text: body }); continue; }
    segs.push({ start: ts2sec(m[1]), end: ts2sec(m[2]), text: body });
  }
  return segs;
}

function parseVtt(text) {
  let s = text.replace(/\r\n/g, '\n').replace(/^WEBVTT.*\n/, '');
  const blocks = s.split(/\n\s*\n/);
  const segs = [];
  for (const blk of blocks) {
    const lines = blk.split('\n').filter((l) => l.length > 0);
    if (!lines.length) continue;
    const timeIdx = lines.findIndex((l) => /-->/.test(l));
    if (timeIdx < 0) continue;
    const time = lines[timeIdx];
    const body = lines.slice(timeIdx + 1).join(' ').trim();
    if (!body) continue;
    const m = time.match(/(\S+)\s*-->\s*(\S+)/);
    if (!m) continue;
    segs.push({ start: ts2sec(m[1]), end: ts2sec(m[2]), text: body });
  }
  return segs;
}

function parseTxt(text) {
  const body = text.replace(/\r\n/g, '\n').trim();
  if (!body) return [];
  return [{ start: 0, end: 0, text: body }];
}

function joinText(segs) {
  return segs.map((s) => s.text).join(' ').replace(/\s+/g, ' ').trim();
}

async function readLocal(p) {
  return await new Promise((resolve, reject) => {
    fs.readFile(p, 'utf8', (err, data) => {
      if (err) return reject(new Error('REPORT_TO_BOSS: read failed ' + p + ' ' + err.message));
      resolve(data);
    });
  });
}

function urlStub(url) {
  try {
    const u = new URL(url);
    return `识别 host=${u.hostname} path=${u.pathname.slice(0, 24)} (未下载视频流)`;
  } catch (e) {
    return 'URL 格式不合法';
  }
}

async function makeTranscript({ path: p, mock, url, lang, format, max_chars }) {
  const langKey = String(lang || 'zh').toLowerCase() === 'en' ? 'en' : 'zh';
  const fmt = String(format || 'text');
  const cap = Number.isFinite(Number(max_chars)) ? Number(max_chars) : 4000;

  let segs = [];
  let source = 'mock';
  let extra = '';

  if (p) {
    const abs = path.resolve(p);
    let ext = path.extname(abs).toLowerCase();
    if (!ext) ext = '.txt';
    const text = await readLocal(abs);
    if (ext === '.srt') { segs = parseSrt(text); source = 'local:srt'; }
    else if (ext === '.vtt') { segs = parseVtt(text); source = 'local:vtt'; }
    else { segs = parseTxt(text); source = 'local:txt'; }
  } else if (toBool(mock) || (!p && !url)) {
    segs = [{ start: 0, end: 0, text: langKey === 'en' ? MOCK_EN : MOCK_ZH }];
    source = 'mock';
  } else if (url) {
    extra = urlStub(url);
    segs = [{ start: 0, end: 0, text: (langKey === 'en' ? MOCK_EN : MOCK_ZH) + ' | ' + extra }];
    source = 'url-stub';
  } else {
    throw new Error('REPORT_TO_BOSS: provide one of --path / --mock / --url');
  }

  let transcript = joinText(segs);
  if (extra && !transcript.includes(extra)) transcript += ' | ' + extra;
  if (transcript.length > cap) transcript = transcript.slice(0, cap) + '...';

  return {
    transcript,
    segments: fmt === 'segments' ? segs : undefined,
    lang: langKey,
    source,
    char_count: transcript.length,
    status: 'ok',
  };
}

module.exports = { makeTranscript, parseSrt, parseVtt, parseTxt };

if (require.main === module) {
  (async () => {
    const args = parseArgs(process.argv);
    try {
      const out = await makeTranscript({
        path: typeof args.path === 'string' ? args.path : undefined,
        mock: args.mock === true || args.mock === 'true',
        url: typeof args.url === 'string' ? args.url : undefined,
        lang: typeof args.lang === 'string' ? args.lang : undefined,
        format: typeof args.format === 'string' ? args.format : undefined,
        max_chars: typeof args.max_chars === 'string' ? args.max_chars : undefined,
      });
      console.log(JSON.stringify(out, null, 2));
    } catch (e) {
      console.error('[FAIL]', e.message);
      process.exit(1);
    }
  })();
}
