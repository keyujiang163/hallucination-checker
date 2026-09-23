// node-script-runner/test.js
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

let pass = 0, fail = 0;
function check(name, cond, info) { if (cond) { pass++; console.log("PASS", name); } else { fail++; console.log("FAIL", name, info || ""); } }

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "node-runner-test-"));
const good = path.join(tmp, "good.js");
const bad = path.join(tmp, "bad.js");
const hang = path.join(tmp, "hang.js");
const notjs = path.join(tmp, "data.txt");

fs.writeFileSync(good, "console.log('hello-from-runner'); console.log('args:', process.argv.slice(2).join('|'));");
fs.writeFileSync(bad, "process.exit(7);");
fs.writeFileSync(hang, "setInterval(() => {}, 1000);");
fs.writeFileSync(notjs, "anything");

// 正常跑
const r = spawnSync("node", ["skills/node-script-runner/index.js", "--script", good, "--cwd", tmp, "--args", "a b c", "--timeout", "5"], { encoding: "utf8", timeout: 15000 });
check("good exit 0", r.status === 0, r.stderr);
let out; try { out = JSON.parse(r.stdout); check("good json", true); } catch (e) { check("good json", false, e.message); out = {}; }
check("good stdout", /hello-from-runner/.test(out.stdout || ""));
check("good args", /args: a.b.c/.test(out.stdout || ""));
check("good status ok", out.status === "ok");
check("good exit_code 0", out.exit_code === 0);

// 错误退出码
const r2 = spawnSync("node", ["skills/node-script-runner/index.js", "--script", bad, "--cwd", tmp, "--timeout", "5"], { encoding: "utf8", timeout: 10000 });
let out2 = {}; try { out2 = JSON.parse(r2.stdout); } catch {}
check("bad exit_code 7", out2.exit_code === 7);
check("bad status error", out2.status === "error");

// timeout
const r3 = spawnSync("node", ["skills/node-script-runner/index.js", "--script", hang, "--cwd", tmp, "--timeout", "1"], { encoding: "utf8", timeout: 15000 });
let out3 = {}; try { out3 = JSON.parse(r3.stdout); } catch {}
check("timeout exit 124", out3.exit_code === 124);
check("timeout status", out3.status === "timeout");

// 非 .js 拒绝
const r4 = spawnSync("node", ["skills/node-script-runner/index.js", "--script", notjs, "--cwd", tmp, "--timeout", "5"], { encoding: "utf8" });
check("non-js rejected", r4.status !== 0);

// 缺 script
const r5 = spawnSync("node", ["skills/node-script-runner/index.js", "--cwd", tmp], { encoding: "utf8" });
check("missing script rejected", r5.status !== 0);

// 不存在
const r6 = spawnSync("node", ["skills/node-script-runner/index.js", "--script", "./nope-xxx.js", "--cwd", tmp, "--timeout", "5"], { encoding: "utf8" });
check("missing script file rejected", r6.status !== 0);

// 缺 cwd
const r7 = spawnSync("node", ["skills/node-script-runner/index.js", "--script", good, "--timeout", "5"], { encoding: "utf8" });
check("missing cwd rejected", r7.status !== 0);

try { fs.rmSync(tmp, { recursive: true, force: true }); } catch {}

console.log(`\nTotal: pass=${pass} fail=${fail}`);
process.exit(fail === 0 ? 0 : 1);
