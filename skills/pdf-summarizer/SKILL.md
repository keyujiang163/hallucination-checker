# pdf-summarizer — PDF 摘要(老板看 PRD/合同高频)

> **解决什么**:老板抛一个 PDF 链接/本地路径,3 秒内拿到首段 + 关键点(不调 LLM)。
> **给谁用**:OpenClaw dev agent + 老板私人助理

## 3 步上手
1. 本地 PDF:`node skills/pdf-summarizer/index.js --path "./docs/spec.pdf"`
2. 在线 PDF:`node skills/pdf-summarizer/index.js --url "https://example.com/x.pdf" --max 4000`
3. 看 stdout:`{ summary, key_points, char_count }`

## 输入
- `path`(可选):本地 PDF 路径(优先用)
- `url`(可选):远程 PDF URL
- `max_chars`(可选):最大返回字符(默认 2000)
- `key_count`(可选):关键点条数(默认 5)

二选一:`--path` 或 `--url`,都没有 → 报错。

## 输出
```
{
  summary: "<首段/前 N 字符>",
  key_points: ["点1","点2","点3","点4","点5"],
  char_count: 1980
}
```

## 实现
- **本地 PDF**:内置 fs.readFileSync → 取 `%PDF-1.x` 头 + 抽字符串流(简易粗抽,纯 ASCII/UTF-8 字符)
- **URL PDF**:`web_fetch` 拉(走 fetch,自带重试 3 次)
- **关键点**:按句号分段 + 前 key_count 句(无 LLM)
- **不支持**:加密 PDF / 扫描版图片 PDF(返回占位提示)

## 用法
```bash
# 本地
node skills/pdf-summarizer/index.js --path ./spec.pdf

# 在线
node skills/pdf-summarizer/index.js --url "https://example.com/x.pdf" --max 5000

# 调关键点数量
node skills/pdf-summarizer/index.js --path ./x.pdf --key-count 8
```

## 红线
- 不联网时(`--url` 无 fetch 能力)直接报 `REPORT_TO_BOSS: net unreachable`
- 单文件硬上限 50MB,超过报错
- **不调用外部 LLM**(0 token 成本)
- 不解密/不破解加密 PDF

## 真话
- PDF 文本抽取是简化版(不解析 layout/字体),只适合文字型 PDF
- 扫描版 PDF 会提示 `note: image-only pdf, may need OCR`
- 测试用临时纯文本 .pdf-like 字节跑,自洽

## 文件
- SKILL.md(本文)
- index.js(主程序 + CLI)
- test.js(自测)
