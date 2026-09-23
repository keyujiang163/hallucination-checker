# copy-template-generator — 文案模板生成器(纯本地,零 LLM)

> **解决什么**:OpenClaw 子代理要批量产 landing / 小红书标题 / 邮件 / 朋友圈 / 广告文案,**不调 LLM**,按 `key_points` 替换变量直接出。
> **给谁用**:dev agent + 运营/营销 owner

## 3 步上手
1. 零凭据、零网络
2. 跑一发:`node skills/copy-template-generator/index.js --type xhs-title --product "AI skill 落地" --points "30 精品,自动获客,真凭据"`
3. 看产物:`{copy, variants:[...]}`(多套变体)

## 真实调用
输入(必传):
- `type`:模板类型枚举
  - `landing`(5 套)
  - `xhs-title`(8 套)
  - `email`(6 套)
  - `wechat-moment`(4 套,朋友圈)
  - `ads`(4 套,信息流)
- `product`:产品名 / 服务名(替换 `{product}`)
- `key_points`:`["点1","点2",...]`,逗号串也行

可选:
- `tone`:语气(`urgent` / `casual` / `formal` / 默认 `casual`)
- `platform`:平台(`xhs` / `weibo` / `douyin`,仅辅助标签)
- `count`:返回变体条数(默认 3,最大不超过该类型模板总数)

输出:
```
{
  copy: '主标题：xxx\n副标题：xxx',
  variants: ['变体1','变体2','变体3']
}
```

## 用法
```bash
# 5 套 landing
node skills/copy-template-generator/index.js --type landing --product "AI skill 落地" --points "30 精品,自动获客,真凭据"

# 小红书标题 8 选 3
node skills/copy-template-generator/index.js --type xhs-title --product "AI skill 落地" --points "30 精品,自动获客,真凭据" --count 3

# 邮件 6 选 2
node skills/copy-template-generator/index.js --type email --product "ac-miniprogram" --points "周报,自动化" --tone formal --count 2
```

## 红线
- **不调 LLM**,模板已落死;新模板需手工扩库
- 字符串模板必须含 `{product}` / `{point:i}` 占位符
- 文件 ≤ 200 行
- 不联网,无凭据

## 模板结构(节选)
- landing:`{product}|{point1}|{point2}|{point3}|{cta}`
- xhs-title:小红书 8 套标题公式(问句 / 数字 / 反差 / 神器 / 避坑 / ...)
- email:6 套邮件主题+正文(提醒 / 周报 / 邀请 / 跟进 / 通知 / 致谢)
- wechat-moment:4 套朋友圈(打卡 / 推荐 / 感悟 / 福利)
- ads:4 套信息流(强 hook / 痛点 / 利益 / 社交证明)
