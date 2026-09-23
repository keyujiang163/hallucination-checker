# Video Script Generator

纯模板拼装的短视频脚本生成器,零 LLM 调用。

## 输入
- `--topic` 必填,主题
- `--platform` douyin|xhs|bilibili|youtube
- `--duration` 数字秒,默认 30
- `--tone` casual|pro|hype,默认 casual

## 输出(JSON)
- `script` 完整脚本
- `scenes` 时间戳 + 画面 + 旁白
- `hooks` 钩子文案候选
- `cta` 行动号召

## 用法
```bash
node skills/video-script-generator/index.js --topic "AI skill 30 天落地" --platform douyin --duration 30
```

## 边界
- 零 LLM,纯模板
- 钩子库每平台 4-6 套
- 行数 ≤200
