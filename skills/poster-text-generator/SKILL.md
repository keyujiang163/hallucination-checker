# Poster Text Generator

海报文字排版建议生成器,纯模板拼接。

## 输入
- `--theme` 主题
- `--product` 产品名
- `--headline` 主标题
- `--subheadline` 副标题(可选)
- `--cta` 行动号召(可选)
- `--style` tech|fresh|warm|bold,默认 tech

## 输出(JSON)
- `text_blocks` 文字块数组(每块含 text/font_size/position)
- `layout_hint` 布局描述
- `fonts_hint` 推荐字体
- `color_palette` 配色数组

## 用法
```bash
node skills/poster-text-generator/index.js --theme "AI skill" --product "hallucination-checker" --headline "5 分钟防幻觉" --style tech
```

## 边界
- 零图片假真,只输出排版建议
- 行数 ≤200
