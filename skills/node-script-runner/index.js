// node-script-runner/index.js
// child_process.spawn('node', [script, ...args]) + timeout 强杀
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

function parseArgs() {
  const argv = process.argv.slice(2);
  const o = { script: "", cwd: "", timeout: 30, args: "", env: "" };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--script") o.script = argv[++i];
    else if (a === "--args") o.args = argv[++i] || "";
    else if (a === "--cwd") o.cwd = argv[++i];
    else if (a === "--timeout") o.timeout = parseInt(argv[++i], 10);
    else if (a === "--env") o.env = argv[++i] || "";
  }
  return o;
}

function main() {
  const o = parseArgs();
  if (!o.script) { console.error("--script required"); process.exit(2); }
  if (!o.cwd) { console.error("--cwd required"); process.exit(2); }

  // 只跑 .js
  if (!o.script.toLowerCase().endsWith(".js")) {
    console.error("only .js allowed"); process.exit(2);
  }
  const absScript = path.isAbsolute(o.script) ? o.script : path.resolve(o.cwd, o.script);
  if (!fs.existsSync(absScript)) { console.error("script not found: " + absScript); process.exit(2); }

  // 拼 args(空格分隔,简化处理;老板可改用 JSON 数组)
  const extraArgs = o.args ? o.args.split(/\s+/).filter(Boolean) : [];

  // env
  const env = Object.assign({}, process.env);
  if (o.env) {
    o.env.split(",").forEach(kv => {
      const idx = kv.indexOf("=");
      if (idx > 0) env[kv.slice(0, idx)] = kv.slice(idx + 1);
    });
  }

  const start = Date.now();
  let status = "ok";
  let timedOut = false;

  const child = spawn("node", [absScript, ...extraArgs], {
    cwd: o.cwd,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  let stdout = "", stderr = "";
  child.stdout.on("data", d => stdout += d.toString());
  child.stderr.on("data", d => stderr += d.toString());

  const timer = setTimeout(() => {
    timedOut = true;
    try { child.kill("SIGKILL"); } catch {}
  }, o.timeout * 1000);

  child.on("close", code => {
    clearTimeout(timer);
    const runtime_ms = Date.now() - start;
    if (timedOut) status = "timeout";
    else if (code !== 0) status = "error";
    console.log(JSON.stringify({
      stdout,
      stderr,
      exit_code: timedOut ? 124 : code,
      runtime_ms,
      status,
    }, null, 2));
  });
}

main();
