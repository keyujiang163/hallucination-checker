# npm Package Publisher

生成 `npm publish` 命令字符串,绝不真发布。

## 输入
- `--path` 包目录路径(默认 ./)
- `--version` 目标版本号,默认读 package.json
- `--registry` 默认 npmjs,可填 npmmirror/私有源
- `--tag` dist-tag,默认 latest
- `--dry-run` true|false,默认 true

## 输出(JSON)
- `version` 实际目标版本
- `tarball_path` 包目录绝对路径
- `status` dry_run|ready
- `command` 可直接 copy 的 shell 命令

## 用法
```bash
node skills/npm-package-publisher/index.js --path ./pkg --version 1.0.1 --dry-run true
```

## 边界(硬红线)
- **绝不真 publish**(海外不通,本工具只生成命令)
- 凭据走 `process.env.NPM_TOKEN`,无则 dry-run 也不带 token
- 无 token 时强制 `--dry-run`
- 行数 ≤200
