// main.js — marketing-ops 统一入口(4 职能串行调度)
// 串行:用 async/await,不 Promise.all
// 失败计数:每职能独立 fail_count,>=3 → throw 'REPORT_TO_BOSS'

'use strict';

const poster = require('./auto-poster');
const funnel = require('./auto-funnel');
const cs = require('./auto-cs');
const renew = require('./auto-renew');

const MAX_FAIL = 3;

function makeCounter() {
  return { fail_count: 0 };
}

async function guarded(name, counter, fn) {
  try {
    const out = await fn();
    counter.fail_count = 0;
    return { ok: true, name, out };
  } catch (e) {
    counter.fail_count += 1;
    console.error('[FAIL][' + name + '][' + counter.fail_count + '/' + MAX_FAIL + ']', e.message);
    if (counter.fail_count >= MAX_FAIL) {
      throw new Error('REPORT_TO_BOSS: ' + name + ' failed ' + MAX_FAIL + ' times');
    }
    return { ok: false, name, err: e.message, fail_count: counter.fail_count };
  }
}

async function schedule({ time_slot = 'morning', day = 1 } = {}) {
  const c = makeCounter();
  return await guarded('schedule', c, () => poster.postNote({ time_slot, day }));
}

async function respond({ platform = 'feishu', user_id, text } = {}) {
  const c = makeCounter();
  return await guarded('respond', c, () => cs.respond({ platform, user_id, text }));
}

async function doFunnel({ event = 'order', payload } = {}) {
  const c = makeCounter();
  return await guarded('funnel', c, () => funnel.funnel({ event, payload }));
}

async function doRenew({ user_id, expire_at } = {}) {
  const c = makeCounter();
  return await guarded('renew', c, () => renew.checkRenew({ user_id, expire_at }));
}

// 串行跑全部 4 职能(testSerial 用)
async function runAllSerial(args) {
  const results = [];
  // 1. schedule
  const r1 = await schedule({ time_slot: args.time_slot || 'morning', day: args.day || 1 });
  results.push(r1);
  // 2. respond
  const r2 = await respond({ platform: 'feishu', user_id: 'u_serial', text: args.cs_text || '能退款吗' });
  results.push(r2);
  // 3. funnel
  const r3 = await doFunnel({ event: 'order', payload: { day: args.day || 1, order_id: 'ord-' + Date.now() } });
  results.push(r3);
  // 4. renew
  const expMs = Date.now() + (args.renew_days || 5) * 86400000;
  const r4 = await doRenew({ user_id: 'u_serial', expire_at: new Date(expMs) });
  results.push(r4);
  return results;
}

module.exports = { schedule, respond, doFunnel, doRenew, runAllSerial };

if (require.main === module) {
  (async () => {
    try {
      const slot = process.argv[2] || 'morning';
      const day = Number(process.argv[3] || '1');
      const results = await runAllSerial({ time_slot: slot, day });
      console.log('[OK][serial]', JSON.stringify(results, null, 2));
    } catch (e) {
      console.error('[FAIL]', e.message);
      process.exit(1);
    }
  })();
}
