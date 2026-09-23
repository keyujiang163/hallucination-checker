// test.js — stripe-checkout 自测(纯本地 mock,不联网)
// 测:1)mock 返回 2)金额/币种/mode/quantity 校验 3)cli 跑通

'use strict';
const assert = require('assert');
const path = require('path');
const { create, buildPayload } = require('./index');

const HERE = __dirname;

(async () => {
  // 1) 默认 mock
  delete process.env.STRIPE_SECRET_KEY;
  const m = create({ product_name: 'skill v1', amount_cents: 2900, currency: 'usd' });
  assert.strictEqual(m.status, 'mock');
  assert.ok(/^cs_test_[a-f0-9]{24}$/.test(m.session_id), 'session id shape: ' + m.session_id);
  assert.strictEqual(m.checkout_url, 'https://checkout.example.com/' + m.session_id);
  assert.strictEqual(m.amount_cents, 2900);
  assert.strictEqual(m.currency, 'usd');
  assert.strictEqual(m.mode, 'payment');
  assert.strictEqual(m.product_name, 'skill v1');

  // 2) product_name 必填
  assert.throws(() => create({ product_name: '', amount_cents: 100 }), /product_name required/);

  // 3) amount_cents 校验
  assert.throws(() => create({ product_name: 'x', amount_cents: 0 }), /positive integer/);
  assert.throws(() => create({ product_name: 'x', amount_cents: -1 }), /positive integer/);
  assert.throws(() => create({ product_name: 'x', amount_cents: 'abc' }), /positive integer/);
  assert.throws(() => create({ product_name: 'x', amount_cents: 9.5 }), /positive integer/);

  // 4) currency 校验
  assert.throws(() => create({ product_name: 'x', amount_cents: 100, currency: 'XYZ' }), /bad currency/);
  assert.throws(() => create({ product_name: 'x', amount_cents: 100, currency: 'btc' }), /bad currency/);

  // 5) mode 校验
  assert.throws(() => create({ product_name: 'x', amount_cents: 100, mode: 'crypto' }), /bad mode/);

  // 6) quantity 校验
  assert.throws(() => create({ product_name: 'x', amount_cents: 100, quantity: 0 }), /quantity/);
  assert.throws(() => create({ product_name: 'x', amount_cents: 100, quantity: -2 }), /quantity/);

  // 7) subscription 模式
  const sub = create({ product_name: 'Pro', amount_cents: 1999, mode: 'subscription' });
  assert.strictEqual(sub.status, 'mock');
  assert.strictEqual(sub.mode, 'subscription');

  // 8) 自定义 quantity + URL
  const cu = create({ product_name: 'ebook', amount_cents: 999, quantity: 3, success_url: 'https://a.com/thanks', cancel_url: 'https://a.com/x' });
  assert.strictEqual(cu.status, 'mock');
  assert.strictEqual(cu.product_name, 'ebook');

  // 9) buildPayload 形状
  const p = buildPayload({ product_name: 'x', amount_cents: 100, currency: 'usd', quantity: 1, mode: 'payment', success_url: 's', cancel_url: 'c' });
  assert.strictEqual(p.mode, 'payment');
  assert.ok(Array.isArray(p.line_items));
  assert.strictEqual(p.line_items[0].price_data.unit_amount, 100);

  // 10) CLI 跑通
  const { execFileSync } = require('child_process');
  const idx = path.join(HERE, 'index.js');
  const stdout = execFileSync(process.execPath, [idx, '--product', 'skill v1', '--amount', '2900', '--currency', 'usd'], { encoding: 'utf8' }).trim();
  const cli = JSON.parse(stdout);
  assert.strictEqual(cli.status, 'mock');
  assert.strictEqual(cli.amount_cents, 2900);
  assert.strictEqual(cli.currency, 'usd');
  assert.ok(cli.checkout_url);

  console.log('OK stripe-checkout (mock + validate + cli)');
})().catch((e) => { console.error('[FAIL]', e.message); process.exit(1); });
