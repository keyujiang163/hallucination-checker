// poster-text-generator/index.js
// 纯模板拼接,只输出文字排版建议
const STYLE = {
  tech: {
    fonts: "Inter / 思源黑体 / 苹方",
    palette: ["#0B1220", "#1F2937", "#22D3EE", "#10B981", "#F8FAFC"],
    layout: "上 1/3 留白,中 1/3 主标题,下 1/3 CTA + 产品名",
    headline_size: 96,
  },
  fresh: {
    fonts: "PingFang SC / 站酷高端黑",
    palette: ["#F0FDF4", "#BBF7D0", "#22C55E", "#064E3B", "#FFFFFF"],
    layout: "对角线分割,左下角主标题,右上角副标题",
    headline_size: 84,
  },
  warm: {
    fonts: "思源宋体 / 楷体 / 华文行楷",
    palette: ["#FFF7ED", "#FDBA74", "#F97316", "#7C2D12", "#FFFBEB"],
    layout: "居中堆叠,主标题最大,产品名最下,圆角边框",
    headline_size: 88,
  },
  bold: {
    fonts: "Anton / Impact / 阿里巴巴普惠体粗",
    palette: ["#000000", "#FF1744", "#FFEB3B", "#FFFFFF", "#212121"],
    layout: "全屏大字,主标题压满 80% 高度,产品名小字压在角落",
    headline_size: 128,
  },
};

function parseArgs() {
  const argv = process.argv.slice(2);
  const o = { theme: "", product: "", headline: "", subheadline: "", cta: "", style: "tech" };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--theme") o.theme = argv[++i];
    else if (a === "--product") o.product = argv[++i];
    else if (a === "--headline") o.headline = argv[++i];
    else if (a === "--subheadline") o.subheadline = argv[++i];
    else if (a === "--cta") o.cta = argv[++i];
    else if (a === "--style") o.style = argv[++i];
  }
  return o;
}

function main() {
  const o = parseArgs();
  if (!o.theme || !o.product || !o.headline) {
    console.error("--theme --product --headline required"); process.exit(2);
  }
  if (!STYLE[o.style]) {
    console.error("--style must be tech|fresh|warm|bold"); process.exit(2);
  }
  const s = STYLE[o.style];

  const text_blocks = [
    { text: o.headline, font_size: s.headline_size, position: "center", weight: "bold" },
    { text: o.subheadline || o.theme, font_size: 36, position: "below_headline", weight: "regular" },
    { text: o.product, font_size: 28, position: "bottom_left", weight: "medium" },
    { text: o.cta || "立即体验", font_size: 32, position: "bottom_right", weight: "bold" },
  ];

  console.log(JSON.stringify({
    text_blocks,
    layout_hint: s.layout,
    fonts_hint: s.fonts,
    color_palette: s.palette,
  }, null, 2));
}

main();
