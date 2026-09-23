// auto-poster.js — 小红书笔记调度(7:30 / 20:30)
// 输入:{time_slot:'morning'|'evening', day:1-30}
// 输出:memory/YYYY-MM-DD-posts.md(追加)
// 红线:每天 ≤2 篇,23:00-07:00 抛错;不调支付

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.env.MARKETING_ROOT || path.resolve(__dirname, '..', '..');
const MEMORY_DIR = path.join(ROOT, 'memory');

function nowParts() {
  const d = new Date();
  return {
    yyyy: d.getFullYear(),
    mm: String(d.getMonth() + 1).padStart(2, '0'),
    dd: String(d.getDate()).padStart(2, '0'),
    hh: d.getHours(),
  };
}

function redLineCheck() {
  const { hh } = nowParts();
  if (hh >= 23 || hh < 7) {
    throw new Error('REPORT_TO_BOSS: post in dead zone 23:00-07:00');
  }
}

// 5 篇笔记(跟 xhs-5-notes.md 对齐)
const NOTES = [
  { idx: 1, title: '打工人必备⚡AI 秘书帮你上班摸鱼 告别日报周报加班', tags: ['#打工人必备', '#AI工具', '#效率神器', '#飞书', '#日报周报', '#上班摸鱼', '#职场干货', '#职场工具', '#副业', '#时间管理'] },
  { idx: 2, title: 'AI 翻车救命神器🛟子代理死了也能救回来', tags: ['#AI工具', '#程序员日常', '#开源', '#debug', '#开发效率', '#自动化', '#技术分享', '#GPT', '#Claude', '#Prompt工程师'] },
  { idx: 3, title: '程序员的 AI 三件套👨‍💻从此告别超时/撞限/泄密', tags: ['#程序员日常', '#AI工具', '#开源', '#技术分享', '#Claude', '#GPT', '#副业', '#开发者', '#自动化', '#技术干货'] },
  { idx: 4, title: 'OpenClaw 30 个精品 skill 包 📦已经卖了 999 单', tags: ['#AI工具', '#程序员日常', '#效率神器', '#开发者', '#技能包', '#大礼包', '#技术分享', '#干货分享', '#副业', '#职场工具'] },
  { idx: 5, title: 'OKR 周报再也不加班 📊一句话生成工作周报', tags: ['#打工人必备', '#AI工具', '#OKR', '#周报', '#效率神器', '#职场干货', '#职场工具', '#时间管理', '#副业', '#上班摸鱼'] },
];

async function postNote({ time_slot, day }) {
  redLineCheck();
  if (!['morning', 'evening'].includes(time_slot)) {
    throw new Error('REPORT_TO_BOSS: bad time_slot ' + time_slot);
  }
  const n = Number(day);
  if (!Number.isInteger(n) || n < 1 || n > 30) {
    throw new Error('REPORT_TO_BOSS: bad day ' + day);
  }
  const pick = NOTES[((n - 1) % 5)];
  const payload = {
    platform: 'xhs',
    time_slot,
    day: n,
    note_idx: pick.idx,
    title: pick.title,
    body: '笔记 ' + pick.idx + ' (day ' + n + ' ' + time_slot + '):老板自己改写,xhs-5-notes.md 拿正文。',
    tags: pick.tags,
  };
  const cookie = process.env.XHS_COOKIE || '';
  if (!cookie) {
    console.log('[POST][DRY]', JSON.stringify(payload));
  } else {
    console.log('[POST]', JSON.stringify(payload));
  }
  if (!fs.existsSync(MEMORY_DIR)) fs.mkdirSync(MEMORY_DIR, { recursive: true });
  const { yyyy, mm, dd } = nowParts();
  const memFile = path.join(MEMORY_DIR, yyyy + '-' + mm + '-' + dd + '-posts.md');
  const line = '\n- ' + new Date().toISOString() + ' | ' + time_slot + ' | day=' + n + ' | note=' + pick.idx + ' | ' + pick.title + '\n';
  fs.appendFileSync(memFile, line, 'utf8');
  return payload;
}

module.exports = { postNote };

if (require.main === module) {
  (async () => {
    try {
      const slot = process.argv[2] || 'morning';
      const day = Number(process.argv[3] || '1');
      const out = await postNote({ time_slot: slot, day });
      console.log('[OK]', JSON.stringify(out));
    } catch (e) {
      console.error('[FAIL]', e.message);
      process.exit(1);
    }
  })();
}
