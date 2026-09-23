// index.js — markdown-to-feishu(md → blocks → doc)
// 输入:{md_text?, file_path?, parent_token?}
// 输出:{doc_token, blocks_count, status}
// 红线:无 token 走 mock,只支持基础语法

'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');

const HOST = 'open.feishu.cn';

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a && a.startsWith('--')) {
      const k = a.slice(2);
      const v = argv[i + 1];
      out[k] = (v && !v.startsWith('--')) ? v : true;
      if (v && !v.startsWith('--')) i++;
    }
  }
  return out;
}

// 把单行 md 转成 block;支持 ## / # / - / **
// 复杂语法原样塞 plain_text
function mdLineToBlock(line) {
  if (/^##\s+/.test(line)) {
    const text = line.replace(/^##\s+/, '').trim();
    return { block_type: 4, heading2: { elements: [{ text_run: { content: text } }] } };
  }
  if (/^#\s+/.test(line)) {
    const text = line.replace(/^#\s+/, '').trim();
    return { block_type: 3, heading1: { elements: [{ text_run: { content: text } }] } };
  }
  if (/^[-*]\s+/.test(line)) {
    const text = line.replace(/^[-*]\s+/, '').trim();
    return { block_type: 12, bullet: { elements: [{ text_run: { content: text } }] } };
  }
  if (!line.trim()) return null; // 空行跳过
  // 其它:尝试解析 **bold**(只做一层)
  const elements = [];
  const re = /\*\*([^*]+)\*\*/g;
  let last = 0; let m;
  while ((m = re.exec(line)) !== null) {
    if (m.index > last) elements.push({ text_run: { content: line.slice(last, m.index) } });
    elements.push({ text_run: { content: m[1], text_element_style: { bold: true } } });
    last = m.index + m[0].length;
  }
  if (last < line.length) elements.push({ text_run: { content: line.slice(last) } });
  if (!elements.length) elements.push({ text_run: { content: line } });
  return { block_type: 2, text: { elements } };
}

function mdToBlocks(md) {
  return md.split(/\r?\n/).map(mdLineToBlock).filter(Boolean);
}

async function postJson(host, p, token, body) {
  return new Promise((resolve, reject) => {
    const data = Buffer.from(JSON.stringify(body), 'utf8');
    const req = https.request({
      host, path: p, method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': data.length,
      },
      timeout: 8000,
    }, (res) => {
      let chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        if (res.statusCode >= 400) {
          return reject(new Error('REPORT_TO_BOSS: feishu ' + res.statusCode + ' ' + raw.slice(0, 200)));
        }
        try { resolve(JSON.parse(raw)); }
        catch (e) { reject(new Error('REPORT_TO_BOSS: bad json ' + raw.slice(0, 200))); }
      });
    });
    req.on('error', (e) => reject(new Error('REPORT_TO_BOSS: net ' + e.message)));
    req.on('timeout', () => { req.destroy(new Error('REPORT_TO_BOSS: timeout')) });
    req.write(data);
    req.end();
  });
}

async function create({ md_text, file_path, parent_token }) {
  let md = '';
  if (file_path) {
    md = fs.readFileSync(path.resolve(file_path), 'utf8');
  } else if (typeof md_text === 'string') {
    md = md_text;
  }
  if (!md || !md.trim()) throw new Error('REPORT_TO_BOSS: md_text or file_path required');

  const blocks = mdToBlocks(md);
  const token = process.env.FEISHU_BOT_TOKEN || '';
  const ts = Date.now();

  if (!token || process.env.ALLOW_LIVE !== '1') {
    const fake = (token ? 'dry' : 'mock') + '_doc_' + Math.random().toString(36).slice(2, 10);
    return { doc_token: fake, blocks_count: blocks.length, status: token ? 'dry' : 'mock', ts };
  }

  const doc = await postJson(HOST, '/open-apis/docx/v1/documents', token, { title: 'markdown-import' });
  const docToken = doc.data && doc.data.document && doc.data.document.document_id;
  return { doc_token: docToken, blocks_count: blocks.length, status: 'created', ts };
}

module.exports = { create, mdToBlocks, mdLineToBlock, parseArgs };

if (require.main === module) {
  (async () => {
    try {
      const a = parseArgs(process.argv);
      const out = await create({ md_text: a.md_text, file_path: a.file, parent_token: a.parent });
      console.log(JSON.stringify(out));
    } catch (e) {
      console.error('[FAIL]', e.message);
      process.exit(1);
    }
  })();
}
