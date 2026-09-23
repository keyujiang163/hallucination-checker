// index.js — feishu-doc-writer(建文档 + 写内容)
// 输入:{title, content, parent_token?}
// 输出:{doc_token, url, status}
// 红线:无 token 走 mock;title/content 必填

'use strict';

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

async function write({ title, content, parent_token }) {
  if (!title || !String(title).trim()) {
    throw new Error('REPORT_TO_BOSS: title required');
  }
  if (!content || !String(content).trim()) {
    throw new Error('REPORT_TO_BOSS: content required');
  }
  const token = process.env.FEISHU_BOT_TOKEN || '';
  const ts = Date.now();

  if (!token || process.env.ALLOW_LIVE !== '1') {
    const fake = (token ? 'dry' : 'mock') + '_doc_' + Math.random().toString(36).slice(2, 10);
    return { doc_token: fake, url: 'https://feishu.cn/docx/' + fake, status: token ? 'dry' : 'mock', ts };
  }

  const docBody = { title, folder_token: parent_token || undefined };
  const doc = await postJson(HOST, '/open-apis/docx/v1/documents', token, docBody);
  const docToken = doc.data && doc.data.document && doc.data.document.document_id;
  // 写文本块(text block_type=2)
  const blockBody = {
    children: [{
      block_type: 2,
      text: { elements: [{ text_run: { content } }] },
    }],
  };
  await postJson(HOST, '/open-apis/docx/v1/documents/' + docToken + '/blocks/' + docToken + '/children', token, blockBody);
  return { doc_token: docToken, url: 'https://feishu.cn/docx/' + docToken, status: 'created', ts };
}

module.exports = { write, parseArgs };

if (require.main === module) {
  (async () => {
    try {
      const a = parseArgs(process.argv);
      const out = await write({ title: a.title, content: a.content, parent_token: a.parent });
      console.log(JSON.stringify(out));
    } catch (e) {
      console.error('[FAIL]', e.message);
      process.exit(1);
    }
  })();
}
