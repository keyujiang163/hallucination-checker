// index.js — 图像 prompt 模板构建器(纯本地,零 LLM/零网络)
// 输入:{subject, style?, mood?, aspect?, details?, seed?}
// 输出:{prompt, prompt_en, negative_prompt, params}
// 红线:不调任何 LLM/图像生成 API;style 必须落在枚举内

'use strict';

const STYLE_MAP = {
  'realistic':     { zh: '写实',     en: 'photorealistic, ultra-detailed, 8k' },
  '写实':          { zh: '写实',     en: 'photorealistic, ultra-detailed, 8k' },
  'illustration':  { zh: '插画',     en: 'digital illustration, clean lines, artstation' },
  '插画':          { zh: '插画',     en: 'digital illustration, clean lines, artstation' },
  'cyberpunk':     { zh: '赛博朋克', en: 'cyberpunk, neon lights, futuristic city, cinematic' },
  '赛博朋克':      { zh: '赛博朋克', en: 'cyberpunk, neon lights, futuristic city, cinematic' },
  'ink':           { zh: '水墨',     en: 'chinese ink painting, sumi-e, minimalist, brushstroke' },
  '水墨':          { zh: '水墨',     en: 'chinese ink painting, sumi-e, minimalist, brushstroke' },
  '3d':            { zh: '3D 渲染',  en: '3d render, octane render, blender, physically based' },
  '3D 渲染':       { zh: '3D 渲染',  en: '3d render, octane render, blender, physically based' },
  '3d-render':     { zh: '3D 渲染',  en: '3d render, octane render, blender, physically based' },
  'anime':         { zh: '动漫',     en: 'anime style, cel shading, vibrant' },
  '动漫':          { zh: '动漫',     en: 'anime style, cel shading, vibrant' },
  'oil-painting':  { zh: '油画',     en: 'oil painting, thick brush strokes, masterpiece' },
  '油画':          { zh: '油画',     en: 'oil painting, thick brush strokes, masterpiece' },
  'pixel':         { zh: '像素',     en: 'pixel art, 16-bit, retro game aesthetic' },
  '像素':          { zh: '像素',     en: 'pixel art, 16-bit, retro game aesthetic' },
  'flat':          { zh: '扁平',     en: 'flat design, vector, minimal, modern' },
  '扁平':          { zh: '扁平',     en: 'flat design, vector, minimal, modern' },
};

const ASPECT_MAP = {
  '1:1':  { w: 1024, h: 1024 },
  '16:9': { w: 1920, h: 1080 },
  '9:16': { w: 1080, h: 1920 },
  '4:3':  { w: 1536, h: 1152 },
  '3:4':  { w: 1152, h: 1536 },
  '21:9': { w: 2520, h: 1080 },
};

const NEG_PROMPT = 'lowres, artifacts, blurry, watermark, text, jpeg artifacts, ugly, deformed, bad anatomy, extra limbs, low quality';

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

function buildPrompt({ subject, style, mood, details, aspect, seed }) {
  if (!subject) throw new Error('REPORT_TO_BOSS: subject required');
  const sk = String(style || 'realistic');
  if (!STYLE_MAP[sk]) throw new Error('REPORT_TO_BOSS: bad style ' + sk + ' (allowed: ' + Object.keys(STYLE_MAP).join(',') + ')');
  const sMeta = STYLE_MAP[sk];

  const aKey = String(aspect || '1:1');
  const aMeta = ASPECT_MAP[aKey] || ASPECT_MAP['1:1'];
  const aspectDesc = aKey === '1:1' ? '正方形构图' : aKey === '16:9' ? '宽屏电影构图' : aKey === '9:16' ? '竖屏构图' : aKey === '21:9' ? '超宽银幕构图' : aKey + ' 构图';

  const detailList = toList(details);
  const detailStr = detailList.join('，');
  const moodStr = String(mood || '').trim();

  const parts = [subject, sMeta.zh + '风格'];
  if (moodStr) parts.push(moodStr);
  if (detailStr) parts.push(detailStr);
  parts.push(aspectDesc);
  parts.push('高质量，精细细节，杰作');
  const prompt = parts.filter(Boolean).join('，');

  const enParts = [subject + ',', sMeta.en];
  if (moodStr) enParts.push(moodStr + ',');
  if (detailStr) enParts.push(detailStr + ',');
  enParts.push('masterpiece, best quality, highly detailed');
  const prompt_en = enParts.filter(Boolean).join(', ').replace(/，/g, ',').replace(/、/g, ',');

  const params = {
    width: aMeta.w,
    height: aMeta.h,
    aspect: aKey,
    style: sk,
    seed: Number.isFinite(Number(seed)) ? Number(seed) : Math.floor(Math.random() * 1e9),
  };

  return { prompt, prompt_en, negative_prompt: NEG_PROMPT, params };
}

module.exports = { buildPrompt, STYLE_MAP, ASPECT_MAP };

if (require.main === module) {
  (async () => {
    const args = parseArgs(process.argv);
    try {
      const out = buildPrompt({
        subject: args.subject,
        style: typeof args.style === 'string' ? args.style : undefined,
        mood: typeof args.mood === 'string' ? args.mood : undefined,
        aspect: typeof args.aspect === 'string' ? args.aspect : undefined,
        details: typeof args.details === 'string' ? args.details.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
        seed: typeof args.seed === 'string' ? args.seed : undefined,
      });
      console.log(JSON.stringify(out, null, 2));
    } catch (e) {
      console.error('[FAIL]', e.message);
      process.exit(1);
    }
  })();
}
