// index.js — PDF 摘要(本地 + URL,无 LLM)
// 输入:{path|url, max_chars?=2000, key_count?=5}
// 输出:{summary, key_points[], char_count}
// 红线:不调外部 LLM,加密 PDF 报占位,不联网则报 net unreachable

'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

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

const MAX_FILE_BYTES = 50 * 1024 * 1024;

function fetchUrl(url, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const lib = u.protocol === 'https:' ? https : http;
    const req = lib.get(url, { timeout: timeoutMs }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchUrl(res.headers.location, timeoutMs).then(resolve, reject);
      }
      if (res.statusCode !== 200) return reject(new Error('REPORT_TO_BOSS: http ' + res.statusCode));
      const chunks = [];
      let total = 0;
      res.on('data', (c) => {
        total += c.length;
        if (total > MAX_FILE_BYTES) {
          res.destroy();
          return reject(new Error('REPORT_TO_BOSS: file too large >50MB'));
        }
        chunks.push(c);
      });
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', (e) => reject(new Error('REPORT_TO_BOSS: net ' + e.message)));
  });
}

// 简化 PDF 文本抽取:抓 ( ) 文本流 + BT...ET 内字符串
function extractTextFromPdf(buf) {
  const head = buf.slice(0, 8).toString('latin1');
  if (!head.startsWith('%PDF-')) return { text: '', note: 'not a pdf' };
  const ascii = buf.toString('latin1');
  const streamBlocks = [];
  // 抓 (...) Tj 样式 / TJ 数组
  const re = /\(((?:\\\)|\\\(|\\[^)]|[^()\\])*)\)\s*(Tj|TJ)/g;
  let m;
  while ((m = re.exec(ascii)) !== null) {
    let t = m[1];
    t = t.replace(/\\([\\()nrt])/g, (_, c) => ({ n: '\n', r: '\r', t: '\t' }[c] || c));
    if (t.trim()) streamBlocks.push(t.trim());
    if (streamBlocks.join(' ').length > 5000) break;
  }
  const text = streamBlocks.join(' ').replace(/\s+/g, ' ').trim();
  if (!text) return { text: '', note: 'image-only pdf, may need OCR' };
  return { text };
}

function summarize({ text, max_chars, key_count }) {
  if (!text) return { summary: '', key_points: [] };
  const sentences = text.split(/(?<=[.!?。！？])\s+/).map((s) => s.trim()).filter(Boolean);
  const summary = (sentences.slice(0, 3).join(' ') || text).slice(0, max_chars);
  const key_points = [];
  for (let i = 0; i < sentences.length && key_points.length < key_count; i += Math.max(1, Math.ceil(sentences.length / key_count))) {
    key_points.push(sentences[i].slice(0, 200));
  }
  while (key_points.length < key_count && sentences[key_points.length]) {
    key_points.push(sentences[key_points.length].slice(0, 200));
  }
  return { summary, key_points };
}

async function pdfSummarize({ source, sourceType = 'path', max_chars = 2000, key_count = 5 }) {
  if (!source) throw new Error('REPORT_TO_BOSS: --path or --url required');
  let buf;
  if (sourceType === 'path') {
    const stat = fs.statSync(source);
    if (stat.size > MAX_FILE_BYTES) throw new Error('REPORT_TO_BOSS: file too large >50MB');
    buf = fs.readFileSync(source);
  } else {
    buf = await fetchUrl(source);
  }
  const { text, note } = extractTextFromPdf(buf);
  if (!text) {
    return { summary: '', key_points: [], char_count: 0, note: note || 'no text' };
  }
  const { summary, key_points } = summarize({ text, max_chars, key_count });
  return { summary, key_points, char_count: summary.length, note: note || undefined };
}

module.exports = { pdfSummarize, extractTextFromPdf };

if (require.main === module) {
  (async () => {
    const args = parseArgs(process.argv);
    try {
      const input = args.path ? { source: args.path, sourceType: 'path' } : args.url ? { source: args.url, sourceType: 'url' } : null;
      if (!input) throw new Error('REPORT_TO_BOSS: --path or --url required');
      const out = await pdfSummarize({
        ...input,
        max_chars: args.max ? Number(args.max) : 2000,
        key_count: args['key-count'] ? Number(args['key-count']) : 5,
      });
      console.log(JSON.stringify(out));
    } catch (e) {
      console.error('[FAIL]', e.message);
      process.exit(1);
    }
  })();
}
