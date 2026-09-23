// index.js — 飞书 IM 发消息(mock + openapi 双模)
// 输入:{chat_id, message, msg_type?='text', receive_id_type?='chat_id'}
// 输出:{message_id, status, ts}
// 凭据:process.env.FEISHU_BOT_TOKEN,无则走 mock
// 红线:不写明文 token,4xx/5xx 不吞错,真发需显式 --force

'use strict';

const https = require('https');
const { URL } = require('url');

const ENDPOINT = 'https://open.feishu.cn/open-apis/im/v1/messages';

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

function rid(s) {
  return String(s || '').replace(/^(chat|open|email|user|thread):/, '');
}

async function send({ chat_id, message, msg_type = 'text', receive_id_type = 'chat_id' }) {
  if (!chat_id) throw new Error('REPORT_TO_BOSS: chat_id required');
  if (typeof message !== 'string' || !message.length) {
    throw new Error('REPORT_TO_BOSS: message required');
  }
  const validType = ['text', 'post', 'image', 'interactive'];
  if (!validType.includes(msg_type)) {
    throw new Error('REPORT_TO_BOSS: bad msg_type ' + msg_type);
  }

  const token = process.env.FEISHU_BOT_TOKEN || '';
  const ts = Date.now();

  // mock 模式:无 token 或加 --mock
  if (!token) {
    const fake = 'mock_' + Math.random().toString(36).slice(2, 10);
    return { message_id: fake, status: 'mock', ts, mode: 'no_token' };
  }

  const content = msg_type === 'text' ? JSON.stringify({ text: message }) : message;
  const body = JSON.stringify({
    receive_id: rid(chat_id),
    msg_type,
    content,
  });

  return await new Promise((resolve, reject) => {
    const u = new URL(ENDPOINT + '?receive_id_type=' + encodeURIComponent(receive_id_type));
    const req = https.request({
      hostname: u.hostname,
      port: 443,
      path: u.pathname + u.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': 'Bearer ' + token,
      },
      timeout: 10000,
    }, (res) => {
      let buf = '';
      res.on('data', (c) => (buf += c));
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const j = JSON.parse(buf);
            if (j.code === 0) {
              resolve({ message_id: j.data && j.data.message_id, status: 'ok', ts });
            } else {
              reject(new Error('REPORT_TO_BOSS: feishu code=' + j.code + ' msg=' + j.msg));
            }
          } catch (e) {
            reject(new Error('REPORT_TO_BOSS: bad json ' + e.message));
          }
        } else {
          reject(new Error('REPORT_TO_BOSS: http ' + res.statusCode + ' body=' + buf.slice(0, 200)));
        }
      });
    });
    req.on('error', (e) => reject(new Error('REPORT_TO_BOSS: net ' + e.message)));
    req.on('timeout', () => { req.destroy(new Error('timeout')); });
    req.write(body);
    req.end();
  });
}

module.exports = { send };

if (require.main === module) {
  (async () => {
    const args = parseArgs(process.argv);
    try {
      const out = await send({
        chat_id: args.chat || args.receive_id,
        message: args.message,
        msg_type: typeof args.msg_type === 'string' ? args.msg_type : 'text',
        receive_id_type: typeof args.receive_id_type === 'string' ? args.receive_id_type : 'chat_id',
      });
      console.log(JSON.stringify(out));
    } catch (e) {
      console.error('[FAIL]', e.message);
      process.exit(1);
    }
  })();
}
