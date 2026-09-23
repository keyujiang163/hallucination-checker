// index.js — Dockerfile 文本生成器(纯模板,绝不打 docker)
// 输入:{base_image?, node_version?, entrypoint?, port?, workdir?, multi_stage?}
// 输出:{dockerfile, content, lines}
// 边界:不联网,不调 docker,只生成文本

'use strict';

const fs = require('fs');
const path = require('path');

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

function boolFlag(v) {
  return v === true || v === 'true' || v === '1' || v === 1;
}

function resolveBase(args) {
  if (typeof args.base_image === 'string' && args.base_image.length) {
    return args.base_image;
  }
  const v = typeof args.node_version === 'string' && args.node_version.length
    ? args.node_version
    : '24';
  return 'node:' + v + '-alpine';
}

function singleStage(b, e, p, w) {
  return [
    'FROM ' + b,
    '',
    'WORKDIR ' + w,
    '',
    '# 依赖层(缓存友好)',
    'COPY package*.json ./',
    'RUN npm ci --omit=dev || npm install --omit=dev',
    '',
    '# 源码',
    'COPY . .',
    '',
    'EXPOSE ' + p,
    '',
    'CMD ["sh", "-c", "' + e + '"]',
  ].join('\n') + '\n';
}

function multiStage(b, e, p, w) {
  return [
    '# ---- builder ----',
    'FROM ' + b + ' AS builder',
    'WORKDIR ' + w,
    'COPY package*.json ./',
    'RUN npm ci || npm install',
    'COPY . .',
    '',
    '# ---- runtime ----',
    'FROM ' + b,
    'WORKDIR ' + w,
    'ENV NODE_ENV=production',
    'COPY package*.json ./',
    'RUN npm ci --omit=dev || npm install --omit=dev',
    'COPY --from=builder ' + w + ' .',
    '',
    'EXPOSE ' + p,
    '',
    'CMD ["sh", "-c", "' + e + '"]',
  ].join('\n') + '\n';
}

function generate({ base_image, node_version, entrypoint, port, workdir, multi_stage }) {
  const b = resolveBase({ base_image, node_version });
  const e = (typeof entrypoint === 'string' && entrypoint.length) ? entrypoint : 'node server.js';
  const p = (typeof port === 'string' || typeof port === 'number') ? String(port) : '3000';
  const w = (typeof workdir === 'string' && workdir.length) ? workdir : '/app';
  const ms = boolFlag(multi_stage);

  if (!/^[A-Za-z0-9_.\-/:-]+$/.test(b)) throw new Error('REPORT_TO_BOSS: bad base_image: ' + b);
  if (!/^\d{2,5}$/.test(p)) throw new Error('REPORT_TO_BOSS: bad port: ' + p);
  if (!/^\/[A-Za-z0-9_.\-/]*$/.test(w)) throw new Error('REPORT_TO_BOSS: bad workdir: ' + w);
  if (/[\n\r]/.test(e)) throw new Error('REPORT_TO_BOSS: entrypoint contains newline');

  const content = ms ? multiStage(b, e, p, w) : singleStage(b, e, p, w);
  return { content, lines: content.split('\n').length - 1 };
}

function writeOut(content, here, stdoutOnly) {
  const outPath = path.join(here, 'Dockerfile');
  if (!stdoutOnly) {
    fs.writeFileSync(outPath, content, 'utf8');
  }
  return { dockerfile: outPath, content, lines: content.split('\n').length - 1 };
}

module.exports = { generate, writeOut };

if (require.main === module) {
  (async () => {
    const args = parseArgs(process.argv);
    try {
      const t = generate({
        base_image: typeof args.base === 'string' ? args.base : typeof args.base_image === 'string' ? args.base_image : undefined,
        node_version: typeof args.node_version === 'string' ? args.node_version : undefined,
        entrypoint: typeof args.entrypoint === 'string' ? args.entrypoint : undefined,
        port: typeof args.port === 'string' ? args.port : undefined,
        workdir: typeof args.workdir === 'string' ? args.workdir : undefined,
        multi_stage: args.multi_stage !== undefined ? args.multi_stage : args['multi-stage'],
      });
      const result = writeOut(t.content, __dirname, args['stdout-only'] === true || args['stdout-only'] === 'true');
      console.log(JSON.stringify(result));
    } catch (e) {
      console.error('[FAIL]', e.message);
      process.exit(1);
    }
  })();
}
