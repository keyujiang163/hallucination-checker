// index.js — GitHub Actions YAML 模板生成器(纯字符串拼接,绝不 push)
// 输入:{name, triggers[], jobs:[{id, runs_on?, needs?, steps:[{...}]}], runner?}
// 输出:{yaml, content, lines}
// 边界:不联网,不调 git,只生成 .yml 文本

'use strict';

const fs = require('fs');
const path = require('path');

const ALLOWED_TRIGGERS = new Set(['push', 'pull_request', 'schedule', 'workflow_dispatch']);

function parseArgs(argv) {
  const out = { _jobs: [], _steps: [] };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const k = a.slice(2);
      const v = argv[i + 1];
      const hasVal = v && !v.startsWith('--');
      const val = hasVal ? v : true;
      if (k === 'job') out._jobs.push(val);
      else if (k === 'step') out._steps.push(val);
      else out[k] = val;
      if (hasVal) i++;
    }
  }
  return out;
}

function splitList(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  return String(v).split(',').map((s) => s.trim()).filter(Boolean);
}

function parseSpec(s) {
  if (typeof s !== 'string') return {};
  const out = {};
  for (const part of s.split(';')) {
    const idx = part.indexOf(':');
    if (idx < 0) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k && v) out[k] = v;
  }
  return out;
}

function yamlEscape(v) {
  if (v === true) return 'true';
  if (v === false) return 'false';
  if (typeof v === 'number') return String(v);
  const s = String(v);
  if (/^[A-Za-z0-9_.\-/@:]+$/.test(s)) return s;
  return JSON.stringify(s);
}

function renderTriggers(list) {
  const out = [];
  for (const t of list) {
    if (!ALLOWED_TRIGGERS.has(t.type)) {
      throw new Error('REPORT_TO_BOSS: bad trigger: ' + t.type);
    }
    if (t.type === 'schedule') {
      out.push('  schedule:\n    - cron: ' + yamlEscape(t.cron || '0 0 * * *'));
    } else {
      out.push('  ' + t.type + ':');
      if (t.branches) {
        for (const b of t.branches) out.push('    branches: [' + yamlEscape(b) + ']');
      } else {
        out.push('    branches: [**]');
      }
    }
  }
  return out.join('\n');
}

function renderStep(s) {
  const lines = [];
  if (s.name) lines.push('    - name: ' + yamlEscape(s.name));
  else lines.push('    - name: ' + yamlEscape(s.id || s.uses || s.run || 'step'));
  if (s.uses) lines.push('      uses: ' + yamlEscape(s.uses));
  if (s.run) lines.push('      run: ' + yamlEscape(s.run));
  if (s.with) {
    lines.push('      with:');
    for (const [k, v] of Object.entries(s.with)) {
      lines.push('        ' + k + ': ' + yamlEscape(v));
    }
  }
  if (s['if']) lines.push('      if: ' + yamlEscape(s['if']));
  return lines.join('\n');
}

function renderJob(j) {
  const lines = [];
  lines.push('  ' + j.id + ':');
  if (j.needs) lines.push('    needs: ' + yamlEscape(j.needs));
  if (j.runs_on) lines.push('    runs-on: ' + yamlEscape(j.runs_on));
  lines.push('    steps:');
  if (Array.isArray(j.steps)) {
    for (const s of j.steps) lines.push(renderStep(s));
  }
  return lines.join('\n');
}

function generate({ name, triggers, jobs, runner }) {
  if (!name) throw new Error('REPORT_TO_BOSS: name required');
  if (!/^[A-Za-z0-9_.-]+$/.test(name)) throw new Error('REPORT_TO_BOSS: bad name: ' + name);
  if (!Array.isArray(jobs) || !jobs.length) throw new Error('REPORT_TO_BOSS: jobs required');

  const trigList = (triggers || []).map((t) => {
    if (typeof t === 'string') {
      if (t.startsWith('schedule:')) {
        return { type: 'schedule', cron: t.slice('schedule:'.length) };
      }
      return { type: t };
    }
    return t;
  });
  if (!trigList.length) throw new Error('REPORT_TO_BOSS: triggers required');

  const defRunner = runner || 'ubuntu-latest';
  const jobsOut = jobs.map((j) => {
    const id = j.id;
    if (!id) throw new Error('REPORT_TO_BOSS: job id required');
    return {
      id,
      runs_on: j.runs_on || defRunner,
      needs: j.needs,
      steps: j.steps || [],
    };
  });

  const lines = [];
  lines.push('name: ' + name);
  lines.push('on:');
  lines.push(renderTriggers(trigList));
  lines.push('');
  lines.push('jobs:');
  for (const j of jobsOut) lines.push(renderJob(j));
  lines.push('');
  const content = lines.join('\n');
  return { content, lines: content.split('\n').length - 1 };
}

function writeOut(content, here, name, stdoutOnly) {
  const outPath = path.join(here, name + '.yml');
  if (!stdoutOnly) {
    fs.writeFileSync(outPath, content, 'utf8');
  }
  return { yaml: outPath, content, lines: content.split('\n').length - 1 };
}

module.exports = { generate, writeOut, parseSpec, parseArgs };

if (require.main === module) {
  (async () => {
    const args = parseArgs(process.argv);
    try {
      const trigList = splitList(args.triggers);
      // Build jobs: collect steps between job markers
      const jobs = [];
      let cur = null;
      for (const j of args._jobs) {
        if (cur) jobs.push(cur);
        const spec = parseSpec(j);
        cur = { id: spec.id, runs_on: spec['runs-on'], needs: spec.needs, steps: [] };
        delete spec.id; delete spec['runs-on']; delete spec.needs;
      }
      for (const s of args._steps) {
        if (!cur) throw new Error('REPORT_TO_BOSS: step without job');
        cur.steps.push(parseSpec(s));
      }
      if (cur) jobs.push(cur);

      const t = generate({
        name: args.name,
        triggers: trigList,
        jobs,
        runner: typeof args.runner === 'string' ? args.runner : undefined,
      });
      const result = writeOut(t.content, __dirname, args.name, args['stdout-only'] === true || args['stdout-only'] === 'true');
      console.log(JSON.stringify(result));
    } catch (e) {
      console.error('[FAIL]', e.message);
      process.exit(1);
    }
  })();
}
