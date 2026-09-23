# dockerfile-generator — Node Dockerfile 文本生成器(纯模板)

> **解决什么**:老板/子代理要生成 Node.js Dockerfile(单阶段 / 多阶段),不调 docker、不联网、纯字符串拼接。
> **给谁用**:OpenClaw dev agent + 需要 Dockerfile 模板的场景

## 3 步上手
1. 跑一发:`node skills/dockerfile-generator/index.js --base node:24-alpine --port 3737 --multi-stage`
2. 看产物:stdout 输出 Dockerfile 内容 + `{dockerfile, content, lines}` JSON
3. **不要 docker build / push**(老板红线)

## 真实调用
输入(可选,都有默认值):
- `base_image`:基础镜像(默认 `node:24-alpine`)
- `node_version`:Node 主版本(默认 `24`,仅在 base_image 缺省时生效)
- `entrypoint`:启动命令(默认 `node server.js`)
- `port`:暴露端口(默认 `3000`)
- `workdir`:工作目录(默认 `/app`)
- `multi_stage`:`true` / `false`(默认 `false`)

输出:
```
{
  dockerfile: "skills/dockerfile-generator/Dockerfile",
  content: "FROM node:24-alpine\n...",
  lines: 12
}
```
**同时落盘到 `skills/dockerfile-generator/Dockerfile`**(相对 cwd)

## 用法
```bash
# 默认单阶段
node skills/dockerfile-generator/index.js

# 多阶段构建
node skills/dockerfile-generator/index.js --base node:24-alpine --port 3737 --multi-stage

# 自定义启动命令
node skills/dockerfile-generator/index.js --entrypoint "node dist/main.js" --port 8080

# 只 stdout 不落盘
node skills/dockerfile-generator/index.js --stdout-only
```

## 限制说明
- **纯模板拼接,不联网、不调 docker、不 git push**
- 默认生成 Node 24-alpine 单阶段;多阶段加 `--multi-stage`
- 端口声明使用 `EXPOSE`(运行时需 `-p` 映射)
- 镜像层缓存优化:`COPY package*.json` 先于 `COPY .`

## 红线
- **绝不 docker build / docker run / docker push**(老板 SOUL 主会话红线)
- **绝不 git push**(老板海外推不了)
- 不安装新 npm 包(只用 Node 内置 fs/path)
- 输入校验失败 → 立即报错,不静默用默认值

## 真话
- 本 skill 不递归 spawn,不调其他 skill
- 失败时 stderr 打印 `[FAIL] <reason>`,exit code 1
- 测试 `node skills/dockerfile-generator/test.js` 不依赖任何凭据 / 不需要 docker daemon

## 文件
- SKILL.md(本文)
- index.js(主程序 + CLI)
- test.js(自测)
