// index.js — 飞书文档读取(mock + openapi 双模)
// 输入:{doc_token, type?='docx', max_bytes?=200000}
// 输出:{content, blocks_count, status}
// 凭据:process.env.FEISHU_BOT_TOKEN

'use strict';

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

function call(pathname, token) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'open.feishu.cn',
      port: 443,
      path: pathname,
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json; charset=utf-8',
      },
      timeout: 10000,
    }, (res) => {
      let buf = '';
      res.on('data', (c) => (buf += c));
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(JSON.parse(buf)); }
          catch (e) { reject(new Error('bad json: ' + e.message)); }
        } else {
          reject(new Error('REPORT_TO_BOSS: http ' + res.statusCode + ' ' + buf.slice(0, 200)));
        }
      });
    });
    req.on('error', (e) => reject(new Error('REPORT_TO_BOSS: net ' + e.message)));
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.end();
  });
}

async function read({ doc_token, type = 'docx', max_bytes = 200000 }) {
  if (!doc_token) throw new Error('REPORT_TO_BOSS: doc_token required');
  if (!['docx', 'wiki', 'sheet', 'bitable'].includes(type)) {
    throw new Error('REPORT_TO_BOSS: bad type ' + type);
  }
  const token = process.env.FEISHU_BOT_TOKEN || '';
  if (!token) {
    return {
      content: '<mock doc ' + type + ' token=' + doc_token + '>\n[placeholder text — add FEISHU_BOT_TOKEN to fetch real content]',
      blocks_count: 1,
      status: 'mock',
    };
  }

  if (type === 'docx') {
    const j = await call('/open-apis/docx/v1/documents/' + encodeURIComponent(doc_token) + '/raw_content', token);
    if (j.code !== 0) throw new Error('REPORT_TO_BOSS: ' + j.code + ' ' + j.msg);
    const content = (j.data && j.data.content) ? String(j.data.content).slice(0, max_bytes) : '';
    return { content, blocks_count: (j.data && j.data.blocks) ? j.data.blocks.length : 0, status: 'ok' };
  }
  if (type === 'wiki') {
    const node = await call('/open-apis/wiki/v2/spaces/get_node?token=' + encodeURIComponent(doc_token), token);
    if (node.code !== 0) throw new Error('REPORT_TO_BOSS: ' + node.code + ' ' + node.msg);
    const obj = node.data && node.data.node && node.data.node.obj_token;
    if (!obj) throw new Error('REPORT_TO_BOSS: wiki missing obj_token');
    return read({ doc_token: obj, type: 'docx', max_bytes });
  }
  // sheet / bitable 简化为调用占位
  const j = await call('/open-apis/' + type + '/v1/' + encodeURIComponent(doc_token), token);
  return {
    content: JSON.stringify(j).slice(0, max_bytes),
    blocks_count: Array.isArray(j.data) ? j.data.length : 1,
    status: 'ok',
  };
}

module.exports = { read };

if (require.main === module) {
  (async () => {
    const args = parseArgs(process.argv);
    try {
      const out = await read({
        doc_token: args.token,
        type: typeof args.type === 'string' ? args.type : 'docx',
        max_bytes: args.max_bytes ? Number(args.max_bytes) : 200000,
      });
      console.log(JSON.stringify(out));
    } catch (e) {
      console.error('[FAIL]', e.message);
      process.exit(1);
    }
  })();
}
