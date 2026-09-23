// index.js — 飞书电子表格读取(mock + openapi 双模)
// 输入:{spreadsheet_token, range?, sheet_id?, force?}
// 输出:{values, rows_count, status, mode}
// 凭据:process.env.FEISHU_BOT_TOKEN,无则 mock,真发需 force=true
// 红线:不写明文 token,4xx/5xx 不吞错,mock 状态显式标

'use strict';

const https = require('https');
const { URL } = require('url');

const SHEET_API = 'https://open.feishu.cn/open-apis/sheets/v3/spreadsheets';
const VALUE_API = 'https://open.feishu.cn/open-apis/sheets/v2/spreadsheets';

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

function rid(s) { return String(s || '').trim(); }

function mockValues() {
  return [
    ['姓名', '部门', '数量'],
    ['张三', '技术', 10],
    ['李四', '产品', 8],
    ['王五', '设计', 12],
    ['赵六', '运营', 5],
  ];
}

function getJSON(u, token) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: u.hostname, port: 443, path: u.pathname + u.search, method: 'GET',
      headers: { 'Authorization': 'Bearer ' + token }, timeout: 10000,
    }, (res) => {
      let buf = '';
      res.on('data', (c) => (buf += c));
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(JSON.parse(buf)); }
          catch (e) { reject(new Error('REPORT_TO_BOSS: bad json ' + e.message)); }
        } else {
          reject(new Error('REPORT_TO_BOSS: http ' + res.statusCode + ' body=' + buf.slice(0, 200)));
        }
      });
    });
    req.on('error', (e) => reject(new Error('REPORT_TO_BOSS: net ' + e.message)));
    req.on('timeout', () => { req.destroy(new Error('timeout')); });
    req.end();
  });
}

async function readSheet({ spreadsheet_token, range, sheet_id, force }) {
  const token = rid(spreadsheet_token);
  if (!token) throw new Error('REPORT_TO_BOSS: spreadsheet_token required');
  const sheet = rid(sheet_id || 'Sheet1');
  const rng = rid(range || 'A1:Z100');
  const ftoken = process.env.FEISHU_BOT_TOKEN || '';

  if (!ftoken) {
    const values = mockValues();
    return { values, rows_count: values.length, range: rng, sheet_id: sheet, status: 'mock', mode: 'no_token' };
  }

  if (!force) {
    console.log('[dry-run] GET ' + VALUE_API + '/' + token + '/values/' + encodeURIComponent(rng));
    return { values: mockValues(), rows_count: 5, range: rng, sheet_id: sheet, status: 'dry-run', mode: 'live' };
  }

  // 1) 元信息
  const u1 = new URL(`${SHEET_API}/${encodeURIComponent(token)}/sheets/${encodeURIComponent(sheet)}`);
  await getJSON(u1, ftoken); // 不严格依赖返回

  // 2) 取值
  const u2 = new URL(`${VALUE_API}/${encodeURIComponent(token)}/values/${encodeURIComponent(rng)}`);
  const j = await getJSON(u2, ftoken);
  if (j.code !== 0) throw new Error('REPORT_TO_BOSS: feishu code=' + j.code + ' msg=' + j.msg);
  const values = (j.data && j.data.valueRange && j.data.valueRange.values) || [];
  return { values, rows_count: values.length, range: rng, sheet_id: sheet, status: 'ok', mode: 'live' };
}

module.exports = { readSheet };

if (require.main === module) {
  (async () => {
    const args = parseArgs(process.argv);
    try {
      const out = await readSheet({
        spreadsheet_token: args.token || args.spreadsheet_token,
        range: typeof args.range === 'string' ? args.range : undefined,
        sheet_id: typeof args.sheet_id === 'string' ? args.sheet_id : undefined,
        force: args.force === true || args.force === 'true',
      });
      console.log(JSON.stringify(out));
    } catch (e) {
      console.error('[FAIL]', e.message);
      process.exit(1);
    }
  })();
}
