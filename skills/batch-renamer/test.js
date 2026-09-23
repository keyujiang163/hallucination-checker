// batch-renamer/test.js
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

let pass = 0, fail = 0;
function check(name, cond, info) { if (cond) { pass++; console.log("PASS", name); } else { fail++; console.log("FAIL", name, info || ""); } }

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "batch-renamer-test-"));
fs.writeFileSync(path.join(tmp, "a.jpeg"), "x");
fs.writeFileSync(path.join(tmp, "b.jpeg"), "x");
fs.writeFileSync(path.join(tmp, "c.png"), "x");
fs.writeFileSync(path.join(tmp, "keep.txt"), "x");

// preview=true(默认)
const r = spawnSync("node", ["skills/batch-renamer/index.js", "--dir", tmp, "--pattern", "\\.jpeg$", "--replacement", ".jpg"], { encoding: "utf8" });
check("preview exit 0", r.status === 0, r.stderr);
let out; try { out = JSON.parse(r.stdout); check("preview json", true); } catch (e) { check("preview json", false, e.message); out = {}; }
check("preview dry_run_safe", out.dry_run_safe === true);
check("preview matched 2", Array.isArray(out.matched) && out.matched.length === 2);
check("preview renamed empty", Array.isArray(out.renamed) && out.renamed.length === 0);
check("preview c.png not matched", !out.matched.some(m => m.endsWith("c.png")));

// 文件未真改
check("a.jpeg still exists", fs.existsSync(path.join(tmp, "a.jpeg")));
check("a.jpg NOT created in preview", !fs.existsSync(path.join(tmp, "a.jpg")));

// 真改:explicit dry-run=false 且 preview=false
const r2 = spawnSync("node", ["skills/batch-renamer/index.js", "--dir", tmp, "--pattern", "\\.jpeg$", "--replacement", ".jpg", "--dry-run", "false", "--preview", "false"], { encoding: "utf8" });
check("real exit 0", r2.status === 0, r2.stderr);
let out2; try { out2 = JSON.parse(r2.stdout); check("real json", true); } catch (e) { check("real json", false, e.message); out2 = {}; }
check("real renamed 2", Array.isArray(out2.renamed) && out2.renamed.length === 2);
check("real dry_run_safe false", out2.dry_run_safe === false);
check("a.jpg now exists", fs.existsSync(path.join(tmp, "a.jpg")));
check("a.jpeg now gone", !fs.existsSync(path.join(tmp, "a.jpeg")));
check("keep.txt untouched", fs.existsSync(path.join(tmp, "keep.txt")));

// dry-run=true 时即便 --preview=false 也强制 dry-run
const tmp2 = fs.mkdtempSync(path.join(os.tmpdir(), "batch-renamer-test2-"));
fs.writeFileSync(path.join(tmp2, "z.jpeg"), "x");
const r3 = spawnSync("node", ["skills/batch-renamer/index.js", "--dir", tmp2, "--pattern", "\\.jpeg$", "--replacement", ".jpg", "--preview", "false"], { encoding: "utf8" });
let out3; try { out3 = JSON.parse(r3.stdout); check("dry-run-force json", true); } catch (e) { check("dry-run-force json", false, e.message); out3 = {}; }
check("dry-run-force dry_run_safe", out3.dry_run_safe === true);
check("z.jpeg still exists after forced dry-run", fs.existsSync(path.join(tmp2, "z.jpeg")));

// 缺参数
const r4 = spawnSync("node", ["skills/batch-renamer/index.js"], { encoding: "utf8" });
check("missing args rejected", r4.status !== 0);

// 坏正则
const r5 = spawnSync("node", ["skills/batch-renamer/index.js", "--dir", tmp, "--pattern", "[bad", "--replacement", "x"], { encoding: "utf8" });
check("bad regex rejected", r5.status !== 0);

// 不存在目录
const r6 = spawnSync("node", ["skills/batch-renamer/index.js", "--dir", "Z:/nonexistent-fake-xxx-dir", "--pattern", "x", "--replacement", "y"], { encoding: "utf8" });
check("nonexistent dir rejected", r6.status !== 0);

// 清理
try { fs.rmSync(tmp, { recursive: true, force: true }); fs.rmSync(tmp2, { recursive: true, force: true }); } catch {}

console.log(`\nTotal: pass=${pass} fail=${fail}`);
process.exit(fail === 0 ? 0 : 1);
