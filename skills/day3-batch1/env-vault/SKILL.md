# env-vault — 凭据安全管理
> **解决什么**:PAT / API key / token 永不走飞书群 / commit / 日志明文 —— 本 skill 统一管理 + mask 输出。
> **给谁用**:OpenClaw 用户 + 任何要存 secret 的脚本

## 3 步上手
1. 引入:const v = require('./skills/day3-batch1/env-vault/vault')
2. 写入:v.set('GITHUB_TOKEN', '<your-pat>', { source: 'manual' })
3. 安全读 + mask:console.log(v.mask(v.get('GITHUB_TOKEN')))  // → ghp_XXXX****zXGe

## 真实案例
输入:
  v.set('GITHUB_TOKEN', 'ghp_abc123def456ghi789jkl012mno345pqr678');
  console.log(v.mask(v.get('GITHUB_TOKEN')));
输出:
  ghp_XXXX****pqr678

## 限制说明
- 存储在 $HOME/.openclaw/vault.json(建议 chmod 600,Windows 走 NTFS ACL)
- 不写明文到日志 / commit / 飞书消息
- mask 默认显示首 4 + 末 8,中间 ****(可调 maskOpts)
- get 不存在的 key 返回 null(不抛错)

## 文件
- SKILL.md(本文)
- vault.js(get/set/mask/list/del)
- test.js(自测)
