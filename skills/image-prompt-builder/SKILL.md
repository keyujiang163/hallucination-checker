# image-prompt-builder — 图像 prompt 模板构建器(纯本地,零 LLM)

> **解决什么**:OpenClaw 子代理要给图像生成模型(stable-diffusion / midjourney)生成结构化 prompt,不调任何 LLM/图像 API,纯模板拼接。
> **给谁用**:dev agent + 设计/海报场景

## 3 步上手
1. 直接用:**零凭据、零网络**
2. 跑一发:`node skills/image-prompt-builder/index.js --subject "未来城市夜景" --style cyberpunk --aspect 16:9 --mood "霓虹/电影感"`
3. 看产物:返回 `{prompt, negative_prompt, params}`,中英双语 prompt

## 真实调用
输入(必传):
- `subject`:主体描述(如 "未来城市夜景")

可选:
- `style`:风格枚举(见下)
- `mood`:情绪关键词
- `aspect`:宽高比(默认 `1:1`)
- `details`:附加细节数组(数组或逗号串)
- `seed`:种子(透传到 params)

支持的 `style`(枚举):
- `realistic` / `写实`
- `illustration` / `插画`
- `cyberpunk` / `赛博朋克`
- `ink` / `水墨`
- `3d` / `3D 渲染` / `3d-render`
- `anime` / `动漫`
- `oil-painting` / `油画`
- `pixel` / `像素`
- `flat` / `扁平`

输出:
```
{
  prompt: "未来城市夜景, 赛博朋克风格, 霓虹, 电影感, ...",
  prompt_en: "Futuristic city night scene, cyberpunk style, ...",
  negative_prompt: "lowres, artifacts, blurry, watermark, text, ...",
  params: { width: 1920, height: 1080, style: 'cyberpunk', aspect: '16:9', seed: 12345 }
}
```

## 用法
```bash
# 默认风格
node skills/image-prompt-builder/index.js --subject "未来城市夜景"

# 指定风格 + 比例
node skills/image-prompt-builder/index.js --subject "赛博少女" --style cyberpunk --aspect 16:9

# 加 mood + details
node skills/image-prompt-builder/index.js \
  --subject "山川日出" --style ink --mood "安静" --details "飞鸟,云海,松树"
```

## 红线
- **不调任何 LLM/图像生成 API**,纯模板拼接
- 不联网,无凭据
- 中英双语,style 枚举不允许自由文本
- 文件 ≤ 200 行

## 模板规则
- 中文 prompt:`{subject}，{style 中文}风格，{mood}，{details}，{aspect 描述}，高质量，精细细节`
- 英文 prompt:`{subject english fallback}，{style english} style，{mood english}，{details english}`
- negative_prompt:`lowres, artifacts, blurry, watermark, text, jpeg artifacts, ugly, deformed, bad anatomy, extra limbs`
