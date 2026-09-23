// auto-funnel.js — 闲鱼拍单 → 发链接 + 拉群 + 续费预警
// 输入:{event:'order'|'invite'|'renew_warn', payload}
// 输出:{action, link?, msg?, sku?}
// 红线:不调支付 API;只触发"发货请求 + 拉群邀请 + 推价"

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.env.MARKETING_ROOT || path.resolve(__dirname, '..', '..');
const LISTINGS_FILE = path.join(ROOT, 'docs', 'marketing', 'xianyu-30-listings.md');

// 30 条 SKU(简表:name + price + 1 个发货链接占位),从 xianyu-30-listings.md 抄
const SKUS = [
  { idx: 1, name: 'lark-meeting-summary', price: '¥19/¥9月', sku: 'lark-meeting-summary-v1' },
  { idx: 2, name: 'lark-attendance-checkin', price: '¥9', sku: 'lark-attendance-checkin-v1' },
  { idx: 3, name: 'lark-okr-progress', price: '¥29/¥9月', sku: 'lark-okr-progress-v1' },
  { idx: 4, name: 'lark-task-triage', price: '¥49', sku: 'lark-task-triage-v1' },
  { idx: 5, name: 'lark-doc-translate', price: '¥19', sku: 'lark-doc-translate-v1' },
  { idx: 6, name: 'lark-sheet-formula', price: '¥9', sku: 'lark-sheet-formula-v1' },
  { idx: 7, name: 'lark-mail-draft', price: '¥19', sku: 'lark-mail-draft-v1' },
  { idx: 8, name: 'lark-approval-bot', price: '¥49', sku: 'lark-approval-bot-v1' },
  { idx: 9, name: 'wechat-article-writer', price: '¥29/¥19月', sku: 'wechat-article-writer-v1' },
  { idx: 10, name: 'xhs-note-generator', price: '¥19', sku: 'xhs-note-generator-v1' },
  { idx: 11, name: 'youtube-script', price: '¥29', sku: 'youtube-script-v1' },
  { idx: 12, name: 'podcast-shownotes', price: '¥9', sku: 'podcast-shownotes-v1' },
  { idx: 13, name: 'tweet-thread', price: '¥9', sku: 'tweet-thread-v1' },
  { idx: 14, name: 'newsletter-digest', price: '¥19', sku: 'newsletter-digest-v1' },
  { idx: 15, name: 'openclaw-audit', price: '¥49/¥19月', sku: 'openclaw-audit-v1' },
  { idx: 16, name: 'dev-runner', price: '¥49/¥19月', sku: 'dev-runner-v1' },
  { idx: 17, name: 'subagent-budget', price: '¥29', sku: 'subagent-budget-v1' },
  { idx: 18, name: 'env-vault', price: '¥99/¥29月', sku: 'env-vault-v1' },
  { idx: 19, name: 'git-commit-msg', price: '¥9', sku: 'git-commit-msg-v1' },
  { idx: 20, name: 'dockerfile-linter', price: '¥19', sku: 'dockerfile-linter-v1' },
  { idx: 21, name: 'api-doc-gen', price: '¥29', sku: 'api-doc-gen-v1' },
  { idx: 22, name: 'log-explainer', price: '¥19', sku: 'log-explainer-v1' },
  { idx: 23, name: 'boss-secretary', price: '¥49/¥19月', sku: 'boss-secretary-v1' },
  { idx: 24, name: 'pricing-calculator', price: '¥19', sku: 'pricing-calculator-v1' },
  { idx: 25, name: 'landing-copywriter', price: '¥29', sku: 'landing-copywriter-v1' },
  { idx: 26, name: 'hn-post-drafter', price: '¥19', sku: 'hn-post-drafter-v1' },
  { idx: 27, name: 'stripe-test-helper', price: '¥29', sku: 'stripe-test-helper-v1' },
  { idx: 28, name: 'weekly-review', price: '¥19', sku: 'weekly-review-v1' },
  { idx: 29, name: 'inbox-triage', price: '¥19', sku: 'inbox-triage-v1' },
  { idx: 30, name: 'pomodoro-tracker', price: '¥9', sku: 'pomodoro-tracker-v1' },
];

const FEISHU_GROUP_LINK = process.env.FEISHU_GROUP_LINK || 'feishu://chat/openclaw-skill-users';

async function funnel({ event, payload }) {
  if (!['order', 'invite', 'renew_warn'].includes(event)) {
    throw new Error('REPORT_TO_BOSS: bad event ' + event);
  }
  payload = payload || {};

  if (event === 'order') {
    const day = Number(payload.day || 1);
    if (!Number.isInteger(day) || day < 1 || day > 30) {
      throw new Error('REPORT_TO_BOSS: bad order day ' + day);
    }
    const sku = SKUS[(day - 1) % 30];
    const link = 'https://deliver.openclaw.dev/' + sku.sku + '?token=auto&order=' + (payload.order_id || 'pending');
    // 红线:不调支付宝/微信/闲鱼支付 SDK,只返回"发货请求"动作
    return { action: 'ship', sku: sku.name, price: sku.price, link, group_invite: FEISHU_GROUP_LINK };
  }

  if (event === 'invite') {
    // 拉群邀请:返回飞书群链接
    return { action: 'invite', link: FEISHU_GROUP_LINK, msg: '老板拍板,进群请发闲鱼订单截图' };
  }

  if (event === 'renew_warn') {
    // 续费预警:推订阅价目
    return { action: 'warn', msg: '续费立减 ¥50,¥299/年终身订阅', sku: 'subscription-renew-v1' };
  }
}

module.exports = { funnel, SKUS };

if (require.main === module) {
  (async () => {
    try {
      const event = process.argv[2] || 'order';
      const day = Number(process.argv[3] || '1');
      const payload = event === 'order' ? { day, order_id: 'demo-' + Date.now() } : {};
      const out = await funnel({ event, payload });
      console.log('[OK]', JSON.stringify(out));
    } catch (e) {
      console.error('[FAIL]', e.message);
      process.exit(1);
    }
  })();
}
