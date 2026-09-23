// auto-renew.js — 订阅到期前 7 天提醒
// 输入:{user_id, expire_at: Date|string}
// 输出:{action, msg?, days_left}
// 红线:不调支付 API

'use strict';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function daysLeft(expireAt) {
  const t = expireAt instanceof Date ? expireAt.getTime() : new Date(expireAt).getTime();
  if (Number.isNaN(t)) throw new Error('REPORT_TO_BOSS: bad expire_at');
  const now = Date.now();
  return Math.floor((t - now) / ONE_DAY_MS);
}

async function checkRenew({ user_id, expire_at }) {
  const dl = daysLeft(expire_at);
  if (dl > 7) {
    return { action: 'noop', user_id: user_id || 'anon', days_left: dl };
  }
  if (dl <= 0) {
    return {
      action: 'warn',
      user_id: user_id || 'anon',
      days_left: dl,
      msg: '已过期,¥299/年续费(终身订阅)',
    };
  }
  return {
    action: 'warn',
    user_id: user_id || 'anon',
    days_left: dl,
    msg: '续费立减 ¥50,¥299/年(原 ¥349)',
  };
}

module.exports = { checkRenew, daysLeft };

if (require.main === module) {
  (async () => {
    try {
      const days = Number(process.argv[2] || '5');
      const expire = new Date(Date.now() + days * ONE_DAY_MS);
      const out = await checkRenew({ user_id: 'u_test', expire_at: expire });
      console.log('[OK]', JSON.stringify(out));
    } catch (e) {
      console.error('[FAIL]', e.message);
      process.exit(1);
    }
  })();
}
