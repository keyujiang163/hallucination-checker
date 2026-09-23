// video-script-generator/test.js
const { spawnSync } = require("child_process");

let pass = 0, fail = 0;

function check(name, cond, info) {
  if (cond) { pass++; console.log("PASS", name); }
  else { fail++; console.log("FAIL", name, info || ""); }
}

const r = spawnSync("node", ["skills/video-script-generator/index.js", "--topic", "AI skill", "--platform", "douyin", "--duration", "30"], { encoding: "utf8" });
check("exit 0", r.status === 0, r.stderr);
let out;
try { out = JSON.parse(r.stdout); check("json parse", true); } catch (e) { check("json parse", false, e.message); out = {}; }
check("has script", typeof out.script === "string" && out.script.length > 0);
check("has scenes", Array.isArray(out.scenes) && out.scenes.length >= 2);
check("has hooks", Array.isArray(out.hooks) && out.hooks.length >= 4);
check("has cta", typeof out.cta === "string" && out.cta.length > 0);

// bad platform
const r2 = spawnSync("node", ["skills/video-script-generator/index.js", "--topic", "x", "--platform", "foo"], { encoding: "utf8" });
check("bad platform rejected", r2.status !== 0);

// missing topic
const r3 = spawnSync("node", ["skills/video-script-generator/index.js"], { encoding: "utf8" });
check("missing topic rejected", r3.status !== 0);

console.log(`\nTotal: pass=${pass} fail=${fail}`);
process.exit(fail === 0 ? 0 : 1);
