---
name: xianyu-listing
version: 1.0.0
created: 2026-09-23
agent: dev
---

# xianyu-listing

闲鱼上挂(SKU 拍单)skill。读 	ools/marketing-ops/auto-funnel.js 的 30 SKU,**绝不发闲鱼**(反爬严),只走 mock → 追加写 memory/xianyu-listings.md。

## 入参
- 	itle (string, 必填):挂的标题
- price (number, 必填):挂价(￥)
- desc (string, 可选):描述
- images (string[], 可选):图片 URL 数组
- category (string, 可选):闲鱼类目
- day (number, 必填, 1-30):选 SKU 索引

## 出参
- listing_id (string):fake id
- url (string):闲鱼详情链接(mock)
- status ('mock'|'queued')
- queue_file (string):落盘的 md 路径

## 凭据
- 无需 token(反爬严,绝不发真闲鱼)

## 用法
bash
node skills/xianyu-listing/index.js --title "skill v1" --price 29 --day 1
node skills/xianyu-listing/index.js --title "X" --price 9 --day 12 --desc "首单"


## 红线
- **绝不发真闲鱼**(反爬严,只 mock + 落盘)
- day 必须在 1-30,空 title/price 必报

## test
node skills/xianyu-listing/test.js → PASS
