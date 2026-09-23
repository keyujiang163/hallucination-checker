// index.js — 文案模板生成器(纯本地,零 LLM)
// 输入:{type, product, key_points[], tone?, platform?, count?}
// 输出:{copy, variants:[]}
// 红线:不调任何 LLM,模板已落死;新模板需手工扩库

'use strict';

// ===== 模板库(每条 fn({product, points, tone})=>string) =====
const TEMPLATES = {
  landing: [
    ({ product, points }) => `【${product}】${points[0] || ''}，${points[1] || ''}。立即体验：xxx`,
    ({ product, points }) => `${product} 上线｜${points[0] || ''} + ${points[1] || ''} + ${points[2] || ''}`,
    ({ product, points }) => `为什么 ${product} 火了？${points[0] || ''} / ${points[1] || ''}`,
    ({ product, points }) => `${product}｜30 分钟上手，${points[0] || ''}、${points[1] || ''}`,
    ({ product, points }) => `从 0 到 1 选 ${product}：${points[0] || ''}、${points[1] || ''}、${points[2] || ''}`,
  ],
  'xhs-title': [
    ({ product, points }) => `${product}｜${points[0] || ''}，真的太顶了`,
    ({ product, points }) => `姐妹们冲！${product} 我用了一周，${points[0] || ''}`,
    ({ product, points }) => `${product}，3 个让我离不开的理由(${points[0] || ''})`,
    ({ product, points }) => `宝藏工具｜${product}，${points[0] || ''}、${points[1] || ''}`,
    ({ product, points }) => `别再找了！${product} 直接给你 ${points[0] || ''}`,
    ({ product, points }) => `${product} 避坑｜${points[0] || ''} 这点要知道`,
    ({ product, points }) => `30 块不到拿下 ${product}，${points[0] || ''}`,
    ({ product, points }) => `老板让我安利 ${product}｜${points[0] || ''}`,
  ],
  email: [
    ({ product, points }) => `[周报] ${product} 本周进展：${points[0] || ''}`,
    ({ product, points }) => `Re: 跟进 — 关于 ${product} 的 ${points[0] || ''}`,
    ({ product, points }) => `邀请｜${product} ${points[0] || ''} 上线内测`,
    ({ product, points }) => `通知｜${product} 服务变更：${points[0] || ''}`,
    ({ product, points }) => `致谢｜${product} 本次合作 ${points[0] || ''}`,
    ({ product, points }) => `Hi 关于 ${product} 的 ${points[0] || ''}，想跟你对一下`,
  ],
  'wechat-moment': [
    ({ product, points }) => `今日打卡：${product}，${points[0] || ''}`,
    ({ product, points }) => `真心推荐｜${product}，${points[0] || ''}、${points[1] || ''}`,
    ({ product, points }) => `${product} 让我重新相信：${points[0] || ''}`,
    ({ product, points }) => `今日福利：${product} ${points[0] || ''}，速来`,
  ],
  ads: [
    ({ product, points }) => `${points[0] || ''}？${product} 一招搞定`,
    ({ product, points }) => `还在为 ${product} 烦恼？${points[0] || ''}`,
    ({ product, points }) => `限时｜${product}，${points[0] || ''}`,
    ({ product, points }) => `万人亲测｜${product}，${points[0] || ''}`,
  ],
};

const TONE_SUFFIX = {
  casual: '',
  urgent: '（限时）',
  formal: '（正式）',
};

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

function toList(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v.map(String);
  if (typeof v === 'string') return v.split(',').map((s) => s.trim()).filter(Boolean);
  return [];
}

function generateCopy({ type, product, key_points, tone, count, platform }) {
  if (!type) throw new Error('REPORT_TO_BOSS: type required');
  const pool = TEMPLATES[type];
  if (!pool) throw new Error('REPORT_TO_BOSS: bad type ' + type + ' (allowed: ' + Object.keys(TEMPLATES).join(',') + ')');
  const prod = String(product || '').trim();
  if (!prod) throw new Error('REPORT_TO_BOSS: product required');
  const pts = toList(key_points);
  if (!pts.length) throw new Error('REPORT_TO_BOSS: key_points required (at least 1)');

  const max = pool.length;
  const n = Math.max(1, Math.min(Number.isFinite(Number(count)) ? Number(count) : 3, max));
  const suffix = TONE_SUFFIX[String(tone || 'casual')] || '';
  const ctx = { product: prod, points: pts, tone, platform };

  const variants = [];
  // 简单轮转:从 0 开始取 n 个
  for (let i = 0; i < n; i++) {
    const text = pool[i](ctx) + suffix;
    variants.push(text);
  }
  return {
    copy: variants[0] || '',
    variants,
    type,
    tone: tone || 'casual',
    platform: platform || 'generic',
  };
}

module.exports = { generateCopy, TEMPLATES };

if (require.main === module) {
  (async () => {
    const args = parseArgs(process.argv);
    try {
      const out = generateCopy({
        type: args.type,
        product: args.product,
        key_points: typeof args.points === 'string' ? args.points.split(',').map((s) => s.trim()).filter(Boolean) : (Array.isArray(args.key_points) ? args.key_points : undefined),
        tone: typeof args.tone === 'string' ? args.tone : undefined,
        platform: typeof args.platform === 'string' ? args.platform : undefined,
        count: typeof args.count === 'string' ? args.count : undefined,
      });
      console.log(JSON.stringify(out, null, 2));
    } catch (e) {
      console.error('[FAIL]', e.message);
      process.exit(1);
    }
  })();
}
