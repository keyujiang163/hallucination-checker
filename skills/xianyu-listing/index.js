// index.js — xianyu-listing(闲鱼挂单,**绝不发真闲鱼**)
// 输入:{title, price, desc?, images?, category?, day}
// 输出:{listing_id, url, status, queue_file}
// 实现:读 tools/marketing-ops/auto-funnel.js 的 SKU 接口,
//     mock 模式追加写 memory/xianyu-listings.md

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.env.MARKETING_ROOT || path.resolve(__dirname, '..', '..');
const FUNNEL_PATH = path.join(ROOT, 'tools', 'marketing-ops', 'auto-funnel.js');
const QUEUE_FILE = path.join(ROOT, 'memory', 'xianyu-listings.md');

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

function loadSkus() {
  if (!fs.existsSync(FUNNEL_PATH)) {
    throw new Error('REPORT_TO_BOSS: funnel not found ' + FUNNEL_PATH);
  }
  const mod = require(FUNNEL_PATH);
  if (!mod || !Array.isArray(mod.SKUS)) {
    throw new Error('REPORT_TO_BOSS: SKUS missing in funnel');
  }
  return mod.SKUS;
}

function ensureDir(p) {
  const d = path.dirname(p);
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

function appendQueue(entry) {
  ensureDir(QUEUE_FILE);
  const exists = fs.existsSync(QUEUE_FILE);
  if (!exists) {
    fs.writeFileSync(QUEUE_FILE, '# xianyu-listings(mock queue)\n\n', 'utf8');
  }
  const line = '- [' + entry.ts + '] ' + entry.sku + ' | ' + entry.title + ' | ￥' + entry.price + ' | id=' + entry.listing_id + '\n';
  fs.appendFileSync(QUEUE_FILE, line, 'utf8');
}

function listing({ title, price, desc, images, category, day }) {
  if (!title || !String(title).trim()) {
    throw new Error('REPORT_TO_BOSS: title required');
  }
  const p = Number(price);
  if (!Number.isFinite(p) || p <= 0) {
    throw new Error('REPORT_TO_BOSS: price required (positive number)');
  }
  const d = Number(day);
  if (!Number.isInteger(d) || d < 1 || d > 30) {
    throw new Error('REPORT_TO_BOSS: day required 1..30');
  }
  const skus = loadSkus();
  const sku = skus[(d - 1) % 30];
  const listingId = 'mock_xianyu_' + Math.random().toString(36).slice(2, 12);
  const ts = new Date().toISOString();

  // 绝不发真闲鱼;只 mock + 落盘
  appendQueue({
    ts, sku: sku.sku, title: String(title), price: p,
    desc: desc || '', images: images || [], category: category || 'auto',
    listing_id: listingId,
  });

  return {
    listing_id: listingId,
    url: 'https://www.goofish.com/item.htm?id=' + listingId + '&mock=1',
    status: 'mock',
    queue_file: QUEUE_FILE,
    sku: sku.name,
    sku_price: sku.price,
    ts,
  };
}

module.exports = { listing, parseArgs, loadSkus, appendQueue, QUEUE_FILE };

if (require.main === module) {
  try {
    const a = parseArgs(process.argv);
    let imgs;
    if (a.images) imgs = String(a.images).split(',').map((s) => s.trim()).filter(Boolean);
    const out = listing({
      title: a.title,
      price: a.price,
      desc: a.desc,
      images: imgs,
      category: a.category,
      day: a.day || 1,
    });
    console.log(JSON.stringify(out));
  } catch (e) {
    console.error('[FAIL]', e.message);
    process.exit(1);
  }
}
