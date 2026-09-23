// test.js — image-prompt-builder 自测(纯本地,零网络)
// 测:1)基础中文 prompt  2)style 枚举  3)aspect 比例  4)mood+details  5)cli 跑通  6)negative 始终存在

'use strict';
const assert = require('assert');
const { buildPrompt } = require('./index');

(async () => {
  // 1) 基础中文 prompt
  const p1 = buildPrompt({ subject: '未来城市夜景' });
  assert.ok(p1.prompt.includes('未来城市夜景'));
  assert.ok(p1.prompt.includes('写实'));
  assert.ok(p1.prompt_en.length > 0);
  assert.ok(p1.negative_prompt.includes('lowres'));

  // 2) style 枚举(cyberpunk)
  const p2 = buildPrompt({ subject: '赛博少女', style: 'cyberpunk', aspect: '16:9' });
  assert.ok(p2.prompt.includes('赛博朋克'));
  assert.ok(p2.params.width === 1920 && p2.params.height === 1080);
  assert.ok(p2.params.aspect === '16:9');

  // 3) 中英双语
  assert.ok(p2.prompt_en.toLowerCase().includes('cyberpunk'));

  // 4) mood + details
  const p3 = buildPrompt({ subject: '山川日出', style: 'ink', mood: '安静', details: ['飞鸟', '云海', '松树'] });
  assert.ok(p3.prompt.includes('安静'));
  assert.ok(p3.prompt.includes('飞鸟'));
  assert.ok(p3.prompt.includes('云海'));

  // 5) 非法 style 抛错
  let badStyleCaught = false;
  try { buildPrompt({ subject: 'x', style: 'van-gogh-clone' }); } catch (e) { badStyleCaught = /bad style/.test(e.message); }
  assert.ok(badStyleCaught, 'illegal style should throw');

  // 6) 必填 subject
  let noSubjCaught = false;
  try { buildPrompt({}); } catch (e) { noSubjCaught = /subject required/.test(e.message); }
  assert.ok(noSubjCaught, 'missing subject should throw');

  // 7) seed 透传
  const p4 = buildPrompt({ subject: 'x', seed: 42 });
  assert.strictEqual(p4.params.seed, 42);

  // 8) CLI 跑通
  const { execFileSync } = require('child_process');
  const path = require('path');
  const out = execFileSync(process.execPath, [
    path.join(__dirname, 'index.js'), '--subject', '测试主体', '--style', 'cyberpunk', '--aspect', '16:9',
  ], { encoding: 'utf8' });
  const cli = JSON.parse(out);
  assert.ok(cli.prompt.includes('测试主体'));
  assert.ok(cli.prompt.includes('赛博朋克'));
  assert.strictEqual(cli.params.aspect, '16:9');

  console.log('OK image-prompt-builder (templates + enum + aspect + cli)');
})().catch((e) => { console.error('[FAIL]', e.message); process.exit(1); });
