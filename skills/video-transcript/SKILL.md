# video-transcript — 视频/字幕文本提炼(纯本地解析,零 LLM/零网络)

> **解决什么**:OpenClaw 子代理要从本地字幕文件(srt/vtt/txt)或视频 URL 拿文字稿,做摘要/纪要/复盘。**不调任何 LLM/whisper/在线转写 API**。
> **给谁用**:dev agent + 内容复盘 owner

## 3 步上手
1. 零凭据、零网络(纯文件 IO)
2. 跑一发(本地 srt):`node skills/video-transcript/index.js --path "./sample.srt"`
3. 跑一发(mock 文本):`node skills/video-transcript/index.js --mock --lang zh`

## 真实调用
输入(选一种):
- `path`:本地字幕文件路径(支持 `.srt` / `.vtt` / `.txt`)
- `mock`:`true` 时返回固定演示稿,不读盘
- `url`:视频 URL(纯识别 + 标头,**不下载视频**,返回 mock transcript)

可选:
- `lang`:`zh` / `en`,影响 mock 输出(默认 `zh`)
- `format`:输出格式(text / segments,默认 `text`)
- `max_chars`:最多输出字符数(默认 4000)

输出:
```
{
  transcript: "大家好，今天分享...",
  segments: [{ start: 0, end: 3.5, text: '...' }, ...],
  lang: 'zh',
  source: 'local:srt' | 'mock' | 'url-stub',
  char_count: 1234,
  status: 'ok'
}
```

## 用法
```bash
# 本地 srt/vtt/txt
node skills/video-transcript/index.js --path "./meeting.srt"
node skills/video-transcript/index.js --path "./talk.vtt" --format segments

# mock 演示稿
node skills/video-transcript/index.js --mock --lang en

# 视频 URL(只识别,不下载)
node skills/video-transcript/index.js --url "https://www.bilibili.com/video/BVxxx" --lang zh
```

## 支持的字幕格式
| ext | 格式 | 解析方式 |
|-----|------|----------|
| .srt | SubRip | 按 `序号\n时间\n文字` 块切 |
| .vtt | WebVTT | 跳 `WEBVTT` 头,按 `时间 --> 时间` 行切 |
| .txt | 纯文本 | 直接读全文,整段作为一个 segment |

## 红线
- **不调任何 LLM/whisper/在线转写 API**
- 不下载视频流(URL 模式仅识别 host + 路径)
- 文件 IO 出错原样 `REPORT_TO_BOSS: ...` 上抛
- 必传 `path` 或 `mock` 或 `url` 三选一,否则报错
- 文件 ≤ 200 行
