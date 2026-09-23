# Node Script Runner

安全跑一个本地 .js 文件,不 eval 不 require 远程。

## 输入
- `--script` 必填,.js 文件绝对或相对路径
- `--args` 可选,空格分隔传给脚本的 argv(本工具不再拆,按整体传)
- `--cwd` 必填,工作目录
- `--timeout` 超时秒数,默认 30
- `--env` K=V 形式,逗号分隔,可选

## 输出(JSON)
- `stdout`
- `stderr`
- `exit_code` 0 / 1 / 124(timeout)
- `runtime_ms`
- `status` ok|timeout|error

## 用法
```bash
node skills/node-script-runner/index.js --script ./demo.js --cwd . --timeout 30
```

## 边界
- 只跑 .js
- 不 eval,不走 -e,不 require 远程 URL
- timeout 强杀
- 行数 ≤200
