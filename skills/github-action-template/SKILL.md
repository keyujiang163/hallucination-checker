# github-action-template — GitHub Actions YAML 模板生成器(纯模板)

> **解决什么**:老板/子代理要生成 GitHub Actions 工作流 .yml(单 job / 多 job 拓扑),不调 git、不联网、纯字符串拼接。
> **给谁用**:OpenClaw dev agent + 需要 workflow 模板的场景

## 3 步上手
1. 跑一发:`node skills/github-action-template/index.js --name ci --triggers push --job "id:build;runs-on:ubuntu-latest" --step "id:checkout;uses:actions/checkout@v4"`
2. 看产物:stdout 输出 YAML + `{yaml, content, lines}` JSON
3. **不要 git push**(老板海外推不了)

## 真实调用
输入(必传):
- `name`:workflow 名(如 `ci`)
- `triggers`:触发器列表(逗号分隔),支持 `push` / `pull_request` / `schedule` / `workflow_dispatch`
- `jobs`:job 列表,每条 `id:<job_id>;runs-on:<runner>;needs:<other>` 后接 step `id:<name>;uses:<action>;run:<cmd>`

可选:
- `runner`:默认 runner(默认 `ubuntu-latest`)

输出:
```
{
  yaml: "skills/github-action-template/ci.yml",
  content: "name: ci\non:\n  push:\n...",
  lines: 25
}
```
**同时落盘到 `skills/github-action-template/<name>.yml`**(相对 cwd)

## 用法
```bash
# 单 job
node skills/github-action-template/index.js --name ci \
  --triggers push,pull_request \
  --job "id:build;runs-on:ubuntu-latest" \
  --step "id:checkout;uses:actions/checkout@v4" \
  --step "id:setup-node;uses:actions/setup-node@v4;with:node-version:24"

# 多 job
node skills/github-action-template/index.js --name release \
  --triggers push \
  --job "id:lint;runs-on:ubuntu-latest" \
  --step "id:checkout;uses:actions/checkout@v4" \
  --job "id:test;runs-on:ubuntu-latest;needs:lint" \
  --step "id:setup-node;uses:actions/setup-node@v4"

# schedule
node skills/github-action-template/index.js --name nightly \
  --triggers "schedule:cron:0 2 * * *"
```

## 限制说明
- **纯 YAML 模板拼接,不联网、不 git push**
- 触发器仅识别 `push` / `pull_request` / `schedule` / `workflow_dispatch`
- schedule 格式:`schedule:cron:0 2 * * *`
- job 间依赖用 `needs` 字段

## 红线
- **绝不 git push**(老板海外推不了)
- **绝不 git commit**(本 skill 只生 .yml)
- 不安装新 npm 包(只用 Node 内置 fs/path)
- 输入校验失败 → 立即报错

## 真话
- 本 skill 不递归 spawn,不调其他 skill
- 失败时 stderr 打印 `[FAIL] <reason>`,exit code 1
- 测试 `node skills/github-action-template/test.js` 不依赖任何凭据

## 文件
- SKILL.md(本文)
- index.js(主程序 + CLI)
- test.js(自测)
