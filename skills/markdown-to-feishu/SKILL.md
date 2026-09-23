---
name: markdown-to-feishu
version: 1.0.0
created: 2026-09-23
agent: dev
---

# markdown-to-feishu

Markdown → 飞书 Docx blocks 转换器。基础语法(## / - / **bold**)转 heading_2 / bullet / text-bold block;复杂的原样塞 plain_text。调 /docx/v1/documents,无 token 走 mock。

## 入参
- md_text (string):markdown 文本(与 file_path 二选一)
- ile_path (string):从文件读
- parent_token (string, 可选):父目录 token

## 出参
- doc_token (string)
- locks_count (number)
- status ('mock'|'created')

## 用法
bash
node skills/markdown-to-feishu/index.js --file ./plan.md
node skills/markdown-to-feishu/index.js --md_text "# Title\n## section\n- item"


## 边界
- 不做完整 md→docx 语法映射
- 支持:## → heading_2 / # → heading_1 / -  / *  → bullet / **x** → bold span
- 其它原样塞 plain_text 块
- 200 行以内

## test
node skills/markdown-to-feishu/test.js → PASS
