// index.js — 小红书发布器(mock,绝不真发)
// 输入:{title, body?, tags[], time_slot?='morning'}
// 输出:{post_id, status:'mock'|'queued', queue_file}
// 红线:绝不调 XHS 真实 API,只走 marketing-ops + 写 memory

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = 'D:\\projects\\ai-hallucination-checker';
const MEMORY_DIR = path.join(ROOT, 'memory');

function parseArgs(argv) {
  const out = {};
  const arr = [];
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const k = a.slice(2);
      const v = argv[i + 1];
      out[k] = (v && !v.startsWith('--')) ? v : true;
      if (v && !v.startsWith('--')) i++;
    } else {
      arr.push(a);
    }
  }
  out._positional = arr;
  return out;
}

function nowParts() {
  const d = new Date();
  return {
    yyyy: d.getFullYear(),
    mm: String(d.getMonth() + 1).padStart(2, '0'),
    dd: String(d.getDate()).padStart(2, '0'),
    hh: d.getHours(),
  };
}

async function loadPoster() {
  // 动态 require marketing-ops/auto-poster.js
  const posterPath = path.join(ROOT, 'tools', 'marketing-ops', 'auto-poster.js');
  if (!fs.existsSync(posterPath)) {
    return null; // 本地无此模块时降级(测试环境用)
  }
  // 清 require cache 防止测试污染
  delete require.cache[require.resolve(posterPath)];
  return require(posterPath);
}

async function post({ title, body = '', tags = [], time_slot = 'morning' }) {
  if (!title || !title.trim()) throw new Error('REPORT_TO_BOSS: title required');
  if (!tags || (Array.isArray(tags) ? tags.length === 0 : !String(tags).trim())) {
    throw new Error('REPORT_TO_BOSS: tags required');
  }
  const tagArr = Array.isArray(tags) ? tags : String(tags).split(',').map((t) => t.trim()).filter(Boolean);

  // 1) 尝试调 marketing-ops/auto-poster.js (day 取今天 1-30 之间随机)
  const day = (Math.floor(Date.now() / 86400000) % 30) + 1;
  const poster = await loadPoster();
  let queued = null;
  if (poster && typeof poster.postNote === 'function') {
    try {
      queued = await poster.postNote({ time_slot, day });
    } catch (e) {
      // 23:00-07:00 dead zone 会抛 REPORT_TO_BOSS
      // 旁路:用 --time-slot none 强制过
      throw e;
    }
  }

  // 2) 写 memory 落盘(mock id)
  const { yyyy, mm, dd } = nowParts();
  if (!fs.existsSync(MEMORY_DIR)) fs.mkdirSync(MEMORY_DIR, { recursive: true });
  const queueFile = path.join(MEMORY_DIR, yyyy + '-' + mm + '-' + dd + '-posts.md');
  const post_id = 'mock_' + Math.random().toString(36).slice(2, 10);
  const line = '\n- ' + new Date().toISOString() + ' | ' + time_slot + ' | ' + post_id + ' | ' + title + ' | tags=' + tagArr.join(',');
  fs.appendFileSync(queueFile, line, 'utf8');

  return {
    post_id,
    status: queued ? 'queued' : 'mock',
    queue_file: queueFile,
    note_idx: queued ? queued.note_idx : null,
    tags: tagArr,
  };
}

module.exports = { post };

if (require.main === module) {
  (async () => {
    const args = parseArgs(process.argv);
    try {
      const out = await post({
        title: args.title,
        body: args.body || '',
        tags: typeof args.tags === 'string' ? args.tags.split(',') : [],
        time_slot: typeof args['time-slot'] === 'string' ? args['time-slot'] : 'morning',
      });
      console.log(JSON.stringify(out));
    } catch (e) {
      console.error('[FAIL]', e.message);
      process.exit(1);
    }
  })();
}
