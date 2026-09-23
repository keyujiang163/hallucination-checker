# Batch Renamer

按正则批量改文件名,只改文件名不动内容。默认 preview。

## 输入
- `--dir` 必填,目录路径
- `--pattern` 必填,正则(JS 语法)
- `--replacement` 必填,替换串
- `--recursive` true|false,默认 false
- `--preview` true|false,默认 true
- `--dry-run` true|false,默认 true

## 输出(JSON)
- `matched` 命中的文件列表
- `renamed` 真改时实际重命名列表
- `skipped` 跳过列表(命中但已被占名等)
- `log` 每条动作的明细
- `dry_run_safe` 是否处于 dry-run(只列不改)

## 用法
```bash
node skills/batch-renamer/index.js --dir ./imgs --pattern "\.jpeg$" --replacement ".jpg" --preview true
```

## 边界(硬红线)
- **只改文件名**,不动文件内容
- 默认 preview=true,老板手工拍才真改
- `--dry-run=true` 永远不真改
- 行数 ≤200
