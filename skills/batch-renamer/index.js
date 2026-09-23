// batch-renamer/index.js
// fs.readdirSync + 正则 + fs.renameSync,preview=true 不真改
const fs = require("fs");
const path = require("path");

function parseArgs() {
  const argv = process.argv.slice(2);
  const o = { dir: "", pattern: "", replacement: "", recursive: "false", preview: "true", dry_run: "true" };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dir") o.dir = argv[++i];
    else if (a === "--pattern") o.pattern = argv[++i];
    else if (a === "--replacement") o.replacement = argv[++i];
    else if (a === "--recursive") o.recursive = argv[++i];
    else if (a === "--preview") o.preview = argv[++i];
    else if (a === "--dry-run") o.dry_run = argv[++i];
  }
  return o;
}

function walk(dir, recursive, out) {
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory() && recursive) walk(full, recursive, out);
    else if (e.isFile()) out.push(full);
  }
}

function main() {
  const o = parseArgs();
  if (!o.dir || !o.pattern) { console.error("--dir and --pattern required"); process.exit(2); }
  if (!fs.existsSync(o.dir)) { console.error("--dir not exist"); process.exit(2); }

  let re;
  try { re = new RegExp(o.pattern); } catch (e) { console.error("bad regex:", e.message); process.exit(2); }

  const files = [];
  walk(o.dir, o.recursive === "true", files);
  const matched = [];
  const log = [];

  for (const f of files) {
    const base = path.basename(f);
    const newBase = base.replace(re, o.replacement);
    if (newBase !== base) {
      const newPath = path.join(path.dirname(f), newBase);
      matched.push({ from: f, to: newPath });
    }
  }

  const dryRun = o.dry_run === "true" || o.preview === "true";
  const renamed = [];
  const skipped = [];

  for (const m of matched) {
    if (dryRun) {
      log.push({ action: "preview", from: m.from, to: m.to });
      continue;
    }
    if (fs.existsSync(m.to)) {
      skipped.push({ from: m.from, to: m.to, reason: "target exists" });
      log.push({ action: "skip", from: m.from, to: m.to });
      continue;
    }
    try {
      fs.renameSync(m.from, m.to);
      renamed.push({ from: m.from, to: m.to });
      log.push({ action: "rename", from: m.from, to: m.to });
    } catch (e) {
      skipped.push({ from: m.from, to: m.to, reason: e.message });
      log.push({ action: "error", from: m.from, to: m.to, err: e.message });
    }
  }

  console.log(JSON.stringify({
    matched: matched.map(m => m.from),
    renamed: renamed.map(m => `${path.basename(m.from)} -> ${path.basename(m.to)}`),
    skipped: skipped,
    log,
    dry_run_safe: dryRun,
  }, null, 2));
}

main();
