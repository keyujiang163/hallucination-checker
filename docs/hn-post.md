Title: Show HN: Stop AI Hallucinations – Verify Any AI Response in 3 Seconds

Body:

Every week I hear the same story: a doctor trusts a clinical summary that cites a paper that doesn't exist; a lawyer forwards a brief with a court case that was never decided; a support rep copy-pastes a refund policy the model invented. The hallucination problem has graduated from "demo quirk" to production liability.

Hallucination Checker is a small web tool that sits between you and the LLM. Paste any AI response (or just the part you don't trust) and it does three things in parallel: (1) splits the paragraph into atomic claims using Anthropic's Claude, (2) fires each claim at Brave Search + Wikipedia in parallel, (3) returns a red/green report with a one-line evidence note for every fact — typically in under 3 seconds.

It's Node + Express, fully open source under MIT, and the core verifier is ~400 lines so anyone can audit the logic. The hosted demo (link below) is free for 50 checks a month and Pro is $9 for 1,000 if you need real volume.

I'd love two things from this community:

1. Try it on the worst LLM output you have lying around — medical advice, citations, financial numbers, anything domain-specific — and tell me which case I broke on.
2. Feedback on the report format: is the red/green badge enough, or do you want confidence scores, source lists, and provenance URLs inline?

GitHub (with deploy instructions): https://github.com/keyujiang163/hallucination-checker
Live demo: https://hallucination-checker.example.com (free, no signup)

Happy to answer technical questions about the claim-extraction prompt, the Brave Search ranking heuristics, or the Stripe billing integration. Thanks for reading.


---

# 中文版(大陆用户可读)

## 标题
Show HN: 阻止 AI 幻觉 —— 3 秒内验证任意 AI 回答

## 正文

最近每周都能听到类似的故事:医生引用了一篇根本不存在的论文,律师递交了一份从未被判决过的判例,客服复制了一段模型凭空捏造的退款政策。AI 幻觉问题已经从"演示 demo 的小毛病"升级成了"真实业务的事故责任"。

**Hallucination Checker(幻觉核查器)** 是一个夹在你和 LLM 之间的网页小工具。把任意 AI 回答(或你不放心的那一段)粘贴进去,它会并行做三件事:(1) 用 Anthropic Claude 把这段话拆成原子级事实点;(2) 把每个事实点并发丢给 Brave Search + Wikipedia 去查;(3) 返回一份红绿报告,每条事实点附一行证据摘要 —— 通常 3 秒内出结果。

技术栈是 Node + Express,MIT 协议完全开源,核心核查逻辑 ~400 行,任何人都可以审计。目前线上 Demo 每月免费 50 次,Pro 版每月 9 美元 / 1000 次,适合真正的高频使用场景。

向 HN 社区求两件事:

1. 用你手头最烂的 LLM 输出 —— 医疗建议 / 学术引用 / 财务数据 / 任何垂直领域 —— 来跑一遍,告诉我它在哪种 case 上崩了。
2. 反馈报告格式:红绿徽章够不够?要不要置信度分数、来源列表、原始出处 URL 直接内联?

GitHub(含部署说明):https://github.com/keyujiang163/hallucination-checker
线上 Demo:https://hallucination-checker.example.com(免费,无需注册)

欢迎在评论里聊事实点抽取的 prompt 设计、Brave Search 排序启发式,或者 Stripe 计费集成的实现细节。谢谢看到这里。

---

## 快速试用流程

1. 访问线上 Demo 链接,免注册
2. 把任意 AI 回答粘贴进文本框(支持中文 / 英文)
3. 点 "开始核查",3 秒内拿到红绿报告
4. 拷贝最烂的那次结果到 GitHub Issues,作者会当天回复

## 适用人群

- 内容审核 / 事实核查记者
- 医生 / 律师 / 咨询顾问等需要引用的角色
- AI 应用开发者,做 RAG 之前先做事实保险
- 客服团队,批量校验话术模板

## 路线图

- v0.2:支持自定义行业知识库(医疗 / 法律 / 金融)
- v0.3:浏览器插件,直接对任意网页上的 AI 内容一键核查
- v0.4:API 网关模式,中间件层接入现有 LLM 服务