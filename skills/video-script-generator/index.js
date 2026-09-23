// video-script-generator/index.js
// 纯模板拼接,零 LLM
const HOOKS = {
  douyin: [
    "你以为 {topic} 很难?其实只用 30 秒。",
    "刷到这条的姐妹有福了,{topic} 一次性讲清。",
    "全网都在问 {topic},我今天直接交底。",
    "{topic} 真正能干的人,从不靠运气。",
    "30 秒看完 {topic},不上头算我输。",
  ],
  xhs: [
    "姐妹们,{topic} 这套打法我整理好了。",
    "亲测有效!{topic} 的正确打开方式。",
    "{topic} 别再踩坑了,我替你试过。",
    "求求你们试试 {topic},真的会谢。",
  ],
  bilibili: [
    "今天我们来聊聊 {topic},干货向预警。",
    "{topic} 这件事,我研究了一年。",
    "如果你也在搞 {topic},这条别错过。",
    "{topic} 入门到上手,我做了张地图。",
  ],
  youtube: [
    "In this video, I will show you everything about {topic}.",
    "Here is the one thing nobody tells you about {topic}.",
    "Stop doing {topic} wrong — here's the right way.",
    "I tried {topic} for 30 days, here's what happened.",
  ],
};

const CTA = {
  douyin: "双击点赞 + 关注,下集更狠。",
  xhs: "评论区扣 1,下一期更细。",
  bilibili: "一键三连,下集讲底层原理。",
  youtube: "Subscribe and hit the bell for the next deep dive.",
};

const BODY = "{topic} 其实就三步:第一,先定义问题边界;第二,套一个能跑的最小循环;第三,把每一步的失败信号记录下来。30 天你会看到质变,前提是别跳步。";

function parseArgs() {
  const argv = process.argv.slice(2);
  const o = { topic: "", platform: "douyin", duration: 30, tone: "casual" };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--topic") o.topic = argv[++i];
    else if (a === "--platform") o.platform = argv[++i];
    else if (a === "--duration") o.duration = parseInt(argv[++i], 10);
    else if (a === "--tone") o.tone = argv[++i];
  }
  return o;
}

function pick(arr, seed) {
  return arr[Math.abs(seed) % arr.length];
}

function main() {
  const o = parseArgs();
  if (!o.topic) { console.error("--topic required"); process.exit(2); }
  if (!HOOKS[o.platform]) { console.error("--platform must be douyin|xhs|bilibili|youtube"); process.exit(2); }

  const seed = [...o.topic].reduce((a, c) => a + c.charCodeAt(0), 0);
  const hooks = HOOKS[o.platform].map(h => h.replace("{topic}", o.topic));
  const hook = pick(hooks, seed);
  const cta = CTA[o.platform];
  const body = BODY.replace("{topic}", o.topic);
  const dur = o.duration;

  const scenes = [
    { ts: `00:00-00:03`, visual: `特写镜头 + 钩子字幕`, voice: hook },
    { ts: `00:03-00:${String(Math.floor(dur*0.7)).padStart(2,'0')}`, visual: `分镜演示 + 关键数据`, voice: body },
    { ts: `00:${String(Math.floor(dur*0.7)).padStart(2,'0')}-00:${String(dur).padStart(2,'0')}`, visual: `Logo + CTA 字幕`, voice: cta },
  ];

  const script = `[HOOK]\n${hook}\n\n[BODY]\n${body}\n\n[CTA]\n${cta}`;

  console.log(JSON.stringify({ script, scenes, hooks, cta }, null, 2));
}

main();
