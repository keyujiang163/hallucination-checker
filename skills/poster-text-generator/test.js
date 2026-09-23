// poster-text-generator/test.js
const { spawnSync } = require("child_process");
let pass = 0, fail = 0;
function check(name, cond, info) { if (cond) { pass++; console.log("PASS", name); } else { fail++; console.log("FAIL", name, info || ""); } }

const r = spawnSync("node", ["skills/poster-text-generator/index.js", "--theme", "AI skill", "--product", "hallucination-checker", "--headline", "5 分钟防幻觉", "--style", "tech"], { encoding: "utf8" });
check("exit 0", r.status === 0, r.stderr);
let out; try { out = JSON.parse(r.stdout); check("json parse", true); } catch (e) { check("json parse", false, e.message); out = {}; }
check("text_blocks array", Array.isArray(out.text_blocks) && out.text_blocks.length >= 3);
check("layout_hint string", typeof out.layout_hint === "string" && out.layout_hint.length > 0);
check("fonts_hint string", typeof out.fonts_hint === "string" && out.fonts_hint.length > 0);
check("color_palette array", Array.isArray(out.color_palette) && out.color_palette.length >= 3);
check("headline in blocks", out.text_blocks.some(b => b.text === "5 分钟防幻觉"));

// bad style
const r2 = spawnSync("node", ["skills/poster-text-generator/index.js", "--theme", "x", "--product", "y", "--headline", "z", "--style", "nope"], { encoding: "utf8" });
check("bad style rejected", r2.status !== 0);

// missing required
const r3 = spawnSync("node", ["skills/poster-text-generator/index.js", "--theme", "x"], { encoding: "utf8" });
check("missing required rejected", r3.status !== 0);

console.log(`\nTotal: pass=${pass} fail=${fail}`);
process.exit(fail === 0 ? 0 : 1);
