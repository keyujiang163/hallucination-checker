// index.js — Stripe Checkout Session 生成器(纯本地 mock,不调真 Stripe)
// 输入:{product_name, amount_cents, currency?, success_url?, cancel_url?, quantity?, mode?}
// 输出:{checkout_url, session_id, status, mode, amount_cents, currency, product_name}
// 边界:绝不调真 Stripe,凭据仅走 process.env.STRIPE_SECRET_KEY(配了也仅 dry-run)

'use strict';

const crypto = require('crypto');

const CURRENCIES = new Set(['usd', 'eur', 'gbp', 'cny', 'jpy', 'hkd', 'sgd', 'aud', 'cad']);
const MODES = new Set(['payment', 'subscription']);

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const k = a.slice(2).replace(/-/g, '_');
      const v = argv[i + 1];
      const hasVal = v && !v.startsWith('--');
      const val = hasVal ? v : true;
      out[k] = val;
      if (hasVal) i++;
    }
  }
  return out;
}

function fakeSessionId() {
  return 'cs_test_' + crypto.randomBytes(12).toString('hex');
}

function buildCheckoutUrl(sessionId) {
  return 'https://checkout.example.com/' + sessionId;
}

function buildPayload(p) {
  return {
    line_items: [{
      price_data: {
        currency: p.currency,
        product_data: { name: p.product_name },
        unit_amount: p.amount_cents,
      },
      quantity: p.quantity,
    }],
    mode: p.mode,
    success_url: p.success_url,
    cancel_url: p.cancel_url,
  };
}

function create({ product_name, amount_cents, currency, success_url, cancel_url, quantity, mode }) {
  if (!product_name) throw new Error('REPORT_TO_BOSS: product_name required');
  const amt = Number(amount_cents);
  if (!Number.isFinite(amt) || !Number.isInteger(amt) || amt <= 0) {
    throw new Error('REPORT_TO_BOSS: amount_cents must be positive integer');
  }
  const cur = (typeof currency === 'string' ? currency.toLowerCase() : 'usd');
  if (!CURRENCIES.has(cur)) throw new Error('REPORT_TO_BOSS: bad currency: ' + cur);
  const m = (typeof mode === 'string' ? mode : 'payment');
  if (!MODES.has(m)) throw new Error('REPORT_TO_BOSS: bad mode: ' + m + ' (payment|subscription)');
  const q = quantity !== undefined ? Number(quantity) : 1;
  if (!Number.isInteger(q) || q < 1) throw new Error('REPORT_TO_BOSS: quantity must be positive integer');

  const p = {
    product_name,
    amount_cents: amt,
    currency: cur,
    success_url: (typeof success_url === 'string' && success_url) || 'https://example.com/success?session_id={CHECKOUT_SESSION_ID}',
    cancel_url: (typeof cancel_url === 'string' && cancel_url) || 'https://example.com/cancel',
    quantity: q,
    mode: m,
  };

  const token = process.env.STRIPE_SECRET_KEY || '';
  const sessionId = fakeSessionId();
  const checkoutUrl = buildCheckoutUrl(sessionId);

  if (!token) {
    return {
      checkout_url: checkoutUrl,
      session_id: sessionId,
      status: 'mock',
      mode: m,
      amount_cents: amt,
      currency: cur,
      product_name,
    };
  }

  // 配了 key → 仅打印 dry-run,绝不真发
  const payload = buildPayload(p);
  console.log('[dry-run] POST https://api.stripe.com/v1/checkout/sessions');
  console.log('[dry-run] payload: ' + JSON.stringify(payload, null, 2));
  return {
    checkout_url: checkoutUrl,
    session_id: sessionId,
    status: 'dry-run',
    mode: m,
    amount_cents: amt,
    currency: cur,
    product_name,
    stripe_payload: payload,
  };
}

module.exports = { create, buildPayload };

if (require.main === module) {
  (async () => {
    const args = parseArgs(process.argv);
    try {
      const out = create({
        product_name: typeof args.product === 'string' ? args.product : (typeof args.product_name === 'string' ? args.product_name : ''),
        amount_cents: typeof args.amount === 'string' || typeof args.amount === 'number' ? args.amount : args.amount_cents,
        currency: typeof args.currency === 'string' ? args.currency : undefined,
        success_url: typeof args.success_url === 'string' ? args.success_url : undefined,
        cancel_url: typeof args.cancel_url === 'string' ? args.cancel_url : undefined,
        quantity: typeof args.quantity === 'string' || typeof args.quantity === 'number' ? args.quantity : undefined,
        mode: typeof args.mode === 'string' ? args.mode : undefined,
      });
      console.log(JSON.stringify(out));
    } catch (e) {
      console.error('[FAIL]', e.message);
      process.exit(1);
    }
  })();
}
