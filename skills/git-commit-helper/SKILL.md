# git-commit-helper — git 提交助手(高频自动化)

> **解决什么**:子代理要频繁 commit(改完就跑一发改完就跑一发),不调 LLM 改 message,统一 `type: message` 格式。
> **给谁用**:OpenClaw dev agent + 所有会改代码的 skill

## 3 步上手
1. 进仓:`cd D:\projects\ai-hallucination-checker`(本 skill **硬绑定此仓**)
2. 跑一发:`node skills/git-commit-helper/index.js --message "新增 X 功能" --type feat`
3. 看 stdout:`{ commit_hash, files_count, status }`

## 输入
- `message`(必):commit message 主体
- `type`(可选):`feat`(默认)/ `fix` / `docs` / `chore` / `refactor` / `test`
- `files`(可选):空格分隔的文件列表,默认所有已 tracked + 未 tracked(简单 `git add -A`)
- `--no-add`(可选):只 commit 已有 staged,不自动 add

## 输出
```
{
  commit_hash: 'a1b2c3d',
  files_count: 3,
  status: 'ok' | 'noop' | 'error'
}
```
无变更时 status='noop'。

## 用法
```bash
# 默认 commit 所有变更
node skills/git-commit-helper/index.js --message "新增 X" --type feat

# 指定文件
node skills/git-commit-helper/index.js --message "fix typo" --type fix --files README.md src/foo.js
```

## 红线
- **只在本仓跑**:`D:\projects\ai-hallucination-checker`(ROOT 硬编码,其他仓 exit 1)
- **绝不 push**(无 `git push` 调用)
- 工作区脏差太大 → status='error'(返回 dirty_files_count)
- 不改 history(不 reset/rebase)
- 超过 --max-files(默认 200) → 拒绝 commit

## 真话
- 测试用 `child_process.execFileSync('git', ...)` 在临时 git init 子目录跑,不动真仓
- 失败时 stderr 打印 `[FAIL] <exit code> <stderr 首行>`,exit code 1
- 默认 commit author 沿用当前 git config,不修改

## 文件
- SKILL.md(本文)
- index.js(主程序 + CLI)
- test.js(自测,真跑 git init 临时仓)
