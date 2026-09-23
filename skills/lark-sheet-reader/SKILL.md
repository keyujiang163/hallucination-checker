# lark-sheet-reader — 飞书电子表格读取(mock + openapi 双模)

> **解决什么**:OpenClaw 子代理要拉飞书 Sheets 数据(汇报/核对/拼成表格),无 token 一律 mock。
> **给谁用**:dev agent + 数据分析 owner

## 3 步上手
1. 配凭据:`$env:FEISHU_BOT_TOKEN = "t-XXX"`
2. 跑一发:`node skills/lark-sheet-reader/index.js --token "***" --range "A1:C10"`
3. 看产物:返回 `{values: [[...]], rows_count, status, mode}`,无 token 时 `status=mock`

## 真实调用
输入(必传):
- `spreadsheet_token`:表格 token(从 URL 取,`sht_xxx`)

可选:
- `range`:`A1:C10` 形式,默认 `A1:Z100`
- `sheet_id`:`Sheet1` / 子表 id,默认 `Sheet1`
- `force`:真发开关(默认 mock / dry-run)

输出:
```
{
  values: [['姓名','数量'],['张三',10],...],
  rows_count: 50,
  status: 'mock' | 'ok' | 'dry-run',
  mode: 'no_token' | 'live'
}
```

## Mock 行为
- 无 `FEISHU_BOT_TOKEN` → 返回 mock 2D 数组(2 列 × 5 行,纯本地)
- 有 token + `force != true` → 不发请求,标记 `status=dry-run`
- 有 token + `force = true` → 拼 URL:`/sheets/v3/spreadsheets/:token/sheets/:sheet_id` + `/sheets/v2/spreadsheets/:token/values`

## 用法
```bash
# 默认 mock
node skills/lark-sheet-reader/index.js --token "sht_xxx" --range "A1:C10"

# 指定 sheet
node skills/lark-sheet-reader/index.js --token "sht_xxx" --sheet_id "Sheet2" --range "A1:B5"

# 真发(慎重)
$env:FEISHU_BOT_TOKEN="t-xxx"; node skills/lark-sheet-reader/index.js --token "sht_xxx" --force
```

## 红线
- token 走 `process.env.FEISHU_BOT_TOKEN`
- 4xx/5xx 不吞错
- mock 状态显式标,不假装成功
- 文件 ≤ 200 行

## 关联
- `/sheets/v3/spreadsheets/:token/sheets/:sheet_id`(元信息)
- `/sheets/v2/spreadsheets/:token/values`(取值)
