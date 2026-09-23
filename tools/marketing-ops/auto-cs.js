// auto-cs.js — 飞书群/闲鱼 IM FAQ 关键词回复
// 输入:{platform:'feishu'|'xianyu', user_id, text}
// 输出:{reply, matched}
// 红线:不接定制(¥999 起老板拍板),不承诺退款金额

'use strict';

const FAQ = [
  { keys: ['退款', '退货', '退钱'], reply: '虚拟商品 7 天内未使用可退,直接闲鱼申请,秒过' },
  { keys: ['怎么用', '如何使用', '上手', '教程', '用法'], reply: '拍下后 1 分钟收到链接,git clone 一份,node test.js 全过即可;不懂老板 1v1 答疑(飞书群)' },
  { keys: ['更新', '升级', '新版'], reply: '包 1 年免费更新;¥299/年订阅 = 终身 + 持续新 skill' },
  { keys: ['chatgpt', 'gpt', '对比', '区别'], reply: 'ChatGPT 是对话;我们是可执行 skill(脚本 + 文档 + 测试),开箱即用不脑暴 prompt' },
  { keys: ['定制', '改', '开发', '专属'], reply: '可以,¥999 起,老板拍需求 24h 出方案;30 合集用户 5 折' },
  { keys: ['老板', '真人', '团队'], reply: '我是 AI 调度员小灵,代老板回答;老板定大方向,执行归运营' },
];

function matchFAQ(text) {
  if (typeof text !== 'string' || !text) return null;
  for (const faq of FAQ) {
    for (const k of faq.keys) {
      if (text.includes(k)) return faq.reply;
    }
  }
  return null;
}

async function respond({ platform, user_id, text }) {
  if (!['feishu', 'xianyu'].includes(platform)) {
    throw new Error('REPORT_TO_BOSS: bad platform ' + platform);
  }
  const reply = matchFAQ(text);
  if (reply) {
    return { platform, user_id: user_id || 'anon', reply, matched: true };
  }
  // 未命中 → 转老板
  const feishuToken = process.env.FEISHU_BOT_TOKEN || '';
  console.log('[CS][UNMATCHED][DRY]', platform, user_id, JSON.stringify(text), 'feishu_token=' + (feishuToken ? feishuToken.slice(0,4) + '****' : 'none'));
  return { platform, user_id: user_id || 'anon', reply: '已转老板,稍后回复', matched: false };
}

module.exports = { respond, FAQ };

if (require.main === module) {
  (async () => {
    try {
      const text = process.argv.slice(2).join(' ') || '你好';
      const out = await respond({ platform: 'feishu', user_id: 'u_test', text });
      console.log('[OK]', JSON.stringify(out));
    } catch (e) {
      console.error('[FAIL]', e.message);
      process.exit(1);
    }
  })();
}
