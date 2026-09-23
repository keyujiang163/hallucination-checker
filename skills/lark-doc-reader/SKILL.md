# lark-doc-reader — 读飞书文档(SOP/设计稿入口)

> **解决什么**:子代理要从飞书文档(SOP/PRD/设计稿/wiki/表格)抽内容,不能裸调 API,无凭据走 mock。
> **给谁用**:OpenClaw dev agent + 任何要吃飞书文档的 skill

## 3 步上手
1. 配 token:`$env:FEISHU_BOT_TOKEN = "t-XXX"`
2. 跑一发:`node skills/lark-doc-reader/index.js --token "doxcnXXX" --type docx`
3. 读 stdout:`{ content, blocks_count, status }`

## 输入
- `doc_token`(必):文档 token,如 `doxcnXXXXXXXX`
- `type`(可选):`docx`(默认)/ `wiki` / `sheet` / `bitable`
- `max_bytes`(可选):最大返回字节(默认 200000)

## 输出
```
{
  content: "<纯文本,blocks 顺序拼接>",
  blocks_count: 42,
  status: 'ok' | 'mock'
}
```
mock 模式:`content` 给一段占位文本,blocks_count=1。

## 用法
```bash
# mock
node skills/lark-doc-reader/index.js --token "doxcnTEST123"

# 真读 docx
$env:FEISHU_BOT_TOKEN = "t-xxxxx"
node skills/lark-doc-reader/index.js --token "doxcnABC" --type docx

# wiki
node skills/lark-doc-reader/index.js --token "wikcnXYZ" --type wiki
```

## 实现
- `docx`:`/docx/v1/documents/:token/raw_content`
- `wiki`:`/wiki/v2/spaces/get_node` + `/docx/v1/documents/:obj/raw_content`
- `sheet`:`/sheets/v3/spreadsheets/:token/sheets` + `/values`
- `bitable`:`/bitable/v1/apps/:app_token/tables/:table_id/records`

mock 模式统一回占位文本 + 提示。

## 红线
- **不写明文 token** 到代码/日志/commit
- mock 模式不加 `--force` 不会真发
- 4xx/5xx 抛错,**不吞**(给上层决)

## 真话
- 本 skill 不递归 spawn
- 测试 `node test.js` 不依赖凭据(mock 自动)
- 真读超时 10s(可在 index.js 改)

## 文件
- SKILL.md(本文)
- index.js(主程序 + CLI)
- test.js(自测)
