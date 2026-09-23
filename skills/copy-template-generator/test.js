// test.js — copy-template-generator 自测(纯本地,零网络)
// 测:1)5 种 type 枚举  2)变体数  3)必填校验  4)tone 后缀  5)cli 跑通  6)product 替换

'use strict';
const assert = require('assert');
const { generateCopy, TEMPLATES } = require('./index');

(async () => {
  // 1) 5 种 type 基础
  for (const t of Object.keys(TEMPLATES)) {
    const r = generateCopy({ type: t, product: 'AI skill 落地', key_points: ['30 精品', '自动获客', '真凭据'] });
    assert.ok(r.copy.length > 0, `${t} copy should produce`);
    assert.ok(Array.isArray(r.variants) && r.variants.length >= 1, `${t} variants`);
    assert.ok(r.variants.every((v) => v.includes('AI skill 落地')), `${t} product should be substituted`);
  }

  // 2) 变体数(<= 模板总数)
  const xhs = generateCopy({ type: 'xhs-title', product: 'ac-mini', key_points: ['p1', 'p2'], count: 3 });
  assert.strictEqual(xhs.variants.length, 3);
  const xhsFull = generateCopy({ type: 'xhs-title', product: 'ac-mini', key_points: ['p1'], count: 100 });
  assert.strictEqual(xhsFull.variants.length, TEMPLATES['xhs-title'].length, 'cap at pool size');

  // 3) type 必填
  let typeBad = false;
  try { generateCopy({ product: 'x', key_points: ['p'] }); } catch (e) { typeBad = /type required/.test(e.message); }
  assert.ok(typeBad);

  // 4) product 必填
  let prodBad = false;
  try { generateCopy({ type: 'email', product: '', key_points: ['p'] }); } catch (e) { prodBad = /product required/.test(e.message); }
  assert.ok(prodBad);

  // 5) key_points 必填
  let ptsBad = false;
  try { generateCopy({ type: 'email', product: 'x', key_points: [] }); } catch (e) { ptsBad = /key_points required/.test(e.message); }
  assert.ok(ptsBad);

  // 6) 非法 type
  let badType = false;
  try { generateCopy({ type: 'rfc1123', product: 'x', key_points: ['p'] }); } catch (e) { badType = /bad type/.test(e.message); }
  assert.ok(badType);

  // 7) tone 后缀
  const urgent = generateCopy({ type: 'ads', product: 'x', key_points: ['p'], tone: 'urgent', count: 1 });
  assert.ok(urgent.variants[0].includes('（限时）'), 'urgent suffix');

  // 8) CLI 跑通
  const { execFileSync } = require('child_process');
  const path = require('path');
  const out = execFileSync(process.execPath, [
    path.join(__dirname, 'index.js'),
    '--type', 'xhs-title',
    '--product', 'AI skill 落地',
    '--points', '30 精品,自动获客,真凭据',
    '--count', '2',
  ], { encoding: 'utf8' });
  const cli = JSON.parse(out);
  assert.strictEqual(cli.type, 'xhs-title');
  assert.strictEqual(cli.variants.length, 2);
  assert.ok(cli.variants.every((v) => v.includes('AI skill 落地')));

  console.log('OK copy-template-generator (5 types + variants + tone + cli + validate)');
})().catch((e) => { console.error('[FAIL]', e.message); process.exit(1); });
