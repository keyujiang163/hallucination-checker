// index.js — 飞书日程创建(mock + openapi 双模)
// 输入:{summary, start_time, end_time, attendees?, description?, calendar_id?, force?}
// 输出:{event_id, url, status, mode}
// 凭据:process.env.FEISHU_BOT_TOKEN,无则 mock,真发需 force=true
// 红线:不写明文 token,4xx/5xx 不吞错,mock 状态显式标

'use strict';

const https = require('https');
const { URL } = require('url');

const API_BASE = 'https://open.feishu.cn/open-apis/calendar/v4/calendars';

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

function rid(s) { return String(s || '').trim(); }

function fakeId() {
  return 'mock_' + Math.random().toString(36).slice(2, 12);
}

function buildUrl(calendarId, eventId) {
  return `https://calendar.feishu.cn/calendar/${encodeURIComponent(calendarId)}/event/${eventId}`;
}

async function postJSON(u, token, body) {
  return await new Promise((resolve, reject) => {
    const req = https.request({
      hostname: u.hostname, port: 443, path: u.pathname + u.search, method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': 'Bearer ' + token,
      },
      timeout: 10000,
    }, (res) => {
      let buf = '';
      res.on('data', (c) => (buf += c));
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(JSON.parse(buf)); }
          catch (e) { reject(new Error('REPORT_TO_BOSS: bad json ' + e.message)); }
        } else {
          reject(new Error('REPORT_TO_BOSS: http ' + res.statusCode + ' body=' + buf.slice(0, 200)));
        }
      });
    });
    req.on('error', (e) => reject(new Error('REPORT_TO_BOSS: net ' + e.message)));
    req.on('timeout', () => { req.destroy(new Error('timeout')); });
    req.write(JSON.stringify(body));
    req.end();
  });
}

async function createEvent({ summary, start_time, end_time, attendees, description, calendar_id, force }) {
  if (!summary) throw new Error('REPORT_TO_BOSS: summary required');
  if (!start_time || !end_time) throw new Error('REPORT_TO_BOSS: start_time and end_time required');
  const calId = rid(calendar_id || 'primary');
  const token = process.env.FEISHU_BOT_TOKEN || '';

  if (!token) {
    const id = fakeId();
    return { event_id: id, url: buildUrl(calId, id), status: 'mock', mode: 'no_token' };
  }

  const body = {
    summary,
    description: description || '',
    start_time: { timestamp: String(Math.floor(Date.parse(start_time) / 1000)) },
    end_time: { timestamp: String(Math.floor(Date.parse(end_time) / 1000)) },
    attendee_ability: 'CanModifyEvent',
    need_notification: false,
    auto_record: false,
  };
  if (Array.isArray(attendees) && attendees.length) {
    body.attendees = attendees.map((a) => ({ type: 'user', user_id: rid(a) }));
  }

  if (!force) {
    console.log('[dry-run] POST ' + API_BASE + '/' + calId + '/events');
    return { event_id: 'dryrun_' + calId, url: buildUrl(calId, 'dryrun'), status: 'dry-run', mode: 'live' };
  }

  const u = new URL(`${API_BASE}/${encodeURIComponent(calId)}/events`);
  const j = await postJSON(u, token, body);
  if (j.code !== 0) throw new Error('REPORT_TO_BOSS: feishu code=' + j.code + ' msg=' + j.msg);
  const event = j.data && j.data.event;
  const id = event && event.event_id || fakeId();
  return { event_id: id, url: buildUrl(calId, id), status: 'ok', mode: 'live' };
}

module.exports = { createEvent };

if (require.main === module) {
  (async () => {
    const args = parseArgs(process.argv);
    try {
      const out = await createEvent({
        summary: args.summary,
        start_time: args.start || args.start_time,
        end_time: args.end || args.end_time,
        attendees: typeof args.attendees === 'string' ? args.attendees.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
        description: typeof args.description === 'string' ? args.description : '',
        calendar_id: typeof args.calendar_id === 'string' ? args.calendar_id : undefined,
        force: args.force === true || args.force === 'true',
      });
      console.log(JSON.stringify(out));
    } catch (e) {
      console.error('[FAIL]', e.message);
      process.exit(1);
    }
  })();
}
