// npm-package-publisher/index.js
// 只生成 npm publish 命令,不真发
const fs = require("fs");
const path = require("path");

function parseArgs() {
  const argv = process.argv.slice(2);
  const o = { path: "./", version: "", registry: "https://registry.npmjs.org/", tag: "latest", dry_run: "true" };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--path") o.path = argv[++i];
    else if (a === "--version") o.version = argv[++i];
    else if (a === "--registry") o.registry = argv[++i];
    else if (a === "--tag") o.tag = argv[++i];
    else if (a === "--dry-run") o.dry_run = argv[++i];
  }
  return o;
}

function readPkgVersion(pkgDir) {
  const p = path.join(pkgDir, "package.json");
  if (!fs.existsSync(p)) return null;
  try {
    const j = JSON.parse(fs.readFileSync(p, "utf8"));
    return j.version || null;
  } catch { return null; }
}

function main() {
  const o = parseArgs();
  const absDir = path.resolve(o.path);
  if (!fs.existsSync(absDir) || !fs.statSync(absDir).isDirectory()) {
    console.error("--path must be a directory"); process.exit(2);
  }

  const version = o.version || readPkgVersion(absDir);
  if (!version) { console.error("--version required or package.json with version needed"); process.exit(2); }

  const hasToken = !!process.env.NPM_TOKEN;
  // 没 token 强制 dry-run
  const dryRun = (o.dry_run === "true") || !hasToken;
  const status = dryRun ? "dry_run" : "ready";

  const parts = [
    "npm publish",
    `"${absDir}"`,
    `--registry "${o.registry}"`,
    `--tag ${o.tag}`,
    `--access public`,
  ];
  if (dryRun) parts.push("--dry-run");

  // token 通过环境变量传,不拼进命令字符串
  let command = parts.join(" ");

  console.log(JSON.stringify({
    version,
    tarball_path: absDir,
    status,
    has_token: hasToken,
    note: hasToken ? "NPM_TOKEN detected — will use via env. Still only generates command, does not run." : "No NPM_TOKEN — forced dry-run.",
    command,
  }, null, 2));
}

main();
