# SKILL 统一模板

> 每个 skill 必须严格遵循本模板 —— 一眼能读懂,价值钩子在第一屏。

---

## 文件结构

每个 skill 是一个独立目录:

\`\`\`
skills/day3-batch1/<skill-name>/
├── SKILL.md      ← 严格遵循本模板
├── <name>.js     ← 主程序
└── test.js       ← 自测脚本(node test.js 必须 exit 0)
\`\`\`

---

## SKILL.md 模板

\`\`\`markdown
# <skill-name> — 一句话价值(≤15 字)
> **解决什么**:<1-2 句话,讲清用户痛点和本 skill 的产出>
> **给谁用**:<目标人群>

## 3 步上手
1. <第 1 步(具体命令)>
2. <第 2 步(具体命令)>
3. <第 3 步(具体命令)>

## 真实案例
输入:<具体调用>
输出:<具体结果,飞书 / 文件 / 日志>

## 限制说明
- <什么情况下不能用>
- <需要什么环境>

## 文件
- SKILL.md(本文)
- <name>.js
- test.js
\`\`\`

---

## 主程序要求

- 顶部注释:用途 + 作者 + 日期
- 导出关键函数给 test.js 用(module.exports)
- 不依赖外部网络(LLM 走可选 adapter,默认本地能跑)
- Windows PS 5.1 兼容(不用 ES2022)

## test.js 要求

- 不依赖外部资源
- 严格断言(assert.strictEqual,assert.ok)
- exit 0 = 通过
- 跑通:\`node test.js\`

---

## 命名规范

- 目录名:小写 + 中划线(lark-meeting-summary)
- 主程序名:同目录名(.js 后缀)
- 类 / 函数:camelCase
- 常量:UPPER_SNAKE
