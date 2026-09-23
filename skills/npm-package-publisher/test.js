// npm-package-publisher/test.js
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

let pass = 0, fail = 0;
function check(name, cond, info) { if (cond) { pass++; console.log("PASS", name); } else { fail++; console.log("FAIL", name, info || ""); } }

// 准备临时 pkg
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "npm-pub-test-"));
fs.writeFileSync(path.join(tmp, "package.json"), JSON.stringify({ name: "demo-pkg", version: "1.2.3" }));

// 无 token 强制 dry-run
delete process.env.NPM_TOKEN;
const r = spawnSync("node", ["skills/npm-package-publisher/index.js", "--path", tmp, "--version", "1.2.3", "--dry-run", "false"], { encoding: "utf8" });
check("exit 0", r.status === 0, r.stderr);
let out; try { out = JSON.parse(r.stdout); check("json parse", true); } catch (e) { check("json parse", false, e.message); out = {}; }
check("forced dry_run without token", out.status === "dry_run");
check("has_version", out.version === "1.2.3");
check("command contains --dry-run", /--dry-run/.test(out.command || ""));
check("command contains --registry", /--registry/.test(out.command || ""));
check("no token in command", !/token/i.test(out.command || ""));

// 带 token 仍 dry-run=true
const r2 = spawnSync("node", ["skills/npm-package-publisher/index.js", "--path", tmp, "--version", "1.2.3", "--dry-run", "true"], { encoding: "utf8" });
check("dry_run=true explicit exit 0", r2.status === 0);

// path 不存在
const r3 = spawnSync("node", ["skills/npm-package-publisher/index.js", "--path", "Z:/nonexistent-fake-dir-xxx", "--version", "1.0.0"], { encoding: "utf8" });
check("nonexistent path rejected", r3.status !== 0);

// 读 package.json 的 version
const r4 = spawnSync("node", ["skills/npm-package-publisher/index.js", "--path", tmp], { encoding: "utf8" });
let out4; try { out4 = JSON.parse(r4.stdout); check("read pkg version", out4.version === "1.2.3"); } catch (e) { check("read pkg version", false, e.message); }

// 清理
try { fs.rmSync(tmp, { recursive: true, force: true }); } catch {}

console.log(`\nTotal: pass=${pass} fail=${fail}`);
process.exit(fail === 0 ? 0 : 1);
