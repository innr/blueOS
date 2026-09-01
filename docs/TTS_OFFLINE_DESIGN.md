# 离线文字朗读设计

状态：Proposal，等待评审后冻结  
版本：0.1  
更新时间：2026-09-01

## 1. 目标

在没有互联网的情况下，让 vivo WATCH GT 播放由文字生成的语音。

第一版必须满足：

1. 手表播放阶段不依赖网络。
2. 语音内容来自书籍章节文本。
3. 支持中文长文本。
4. 支持暂停、继续、切换章节和续播。
5. 语音文件传输完成并校验成功后，手表可以独立播放。
6. 不把第三方 TTS 模型和私有凭据硬编码到仓库。

需要明确的边界：

- 如果要求“手表单独拿到一段新文字，在没有手机、没有网络时立即完成神经 TTS 合成”，则需要手表端 Native TTS 引擎，这不是普通 BlueOS JS 应用可以直接保证的能力，作为第二阶段技术预研。
- 第一版采用“手机/电脑离线合成，手表离线播放”。生成阶段也不需要网络，但需要手机或电脑上预先安装 TTS 模型。

## 2. 方案比较

| 方案 | 播放时是否需要网络 | 优点 | 主要风险 | 决策 |
|---|---:|---|---|---|
| BlueOS `@blueos.ai.speech` | 是 | 官方 API，接入快 | 依赖 WebSocket、appId/appKey | 不用于离线主路径 |
| 手表端 eSpeak NG | 否 | 体积小、C 实现、易移植 | 音质机械；需要 Native API | 作为 Native PoC |
| 手表端 sherpa-onnx/Piper | 否 | 神经 TTS，音质更好 | 模型、内存、算力和 Native 接入风险较高 | 暂不作为 V1 |
| 手机/电脑离线 TTS，手表播放音频 | 否 | 手表端简单、可靠，适合长文本 | 新内容需要先在手机/电脑生成和传输 | V1 采用 |
| 发布前预生成音频 | 否 | 最稳定 | 不能朗读临时新文本 | 作为测试和样例兜底 |

## 3. 总体架构

V1 分为三个边界：

1. **OfflineTtsEngine**：运行在 Android 手机或开发电脑上，使用本地模型把章节文本转换为音频。
2. **AudioArtifact/Transfer**：把音频分段、校验并通过现有传输协议发送到手表。
3. **WatchAudioPlayer**：BlueOS 只保存和播放本地音频，不加载 TTS 模型，不访问云端。

流程：

```
章节文本
  -> 文本规范化与分段
  -> 手机/电脑离线 TTS
  -> 音频文件与元数据
  -> SHA-256 校验
  -> 蓝牙传输
  -> 手表原子落盘
  -> BlueOS 本地音频播放
```

## 4. TTS 引擎选择

### V1 候选：sherpa-onnx

[sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx) 支持离线 TTS、Android、C/C++，并提供中文模型和异步生成示例。初始评估以下路线：

- `matcha-icefall-zh-baker)：中文单说话人，适合作为小范围音质基线。
- `vits-melo-tts-zh_en`：中文/英文单说话人，适合中英混合文本。
- Kokoro/ZipVoice：在资源和许可证评估完成后再考虑。

运行时许可证和模型许可证必须分别记录。模型不直接提交到 Git 仓库，通过版本、下载地址和 SHA-256 固定。

### 手表端候选：eSpeak NG

[eSpeak NG](https://github.com/espeak-ng/espeak-ng) 是体积较小的 C 语言 TTS，可以生成 WAV 或通过共享库调用，但采用 formant synthesis，中文听书自然度可能不够。只有在确认 BlueOS Native SDK、应用原生库加载和音频输出路径后，才进行移植 PoC。

### 不采用的方案

BlueOS 官方的 `@blueos.ai.speech` TTS 需要 WebSocket 和 vivo AI 平台认证；它可以用于在线对照测试，但不满足离线约束。

## 5. 数据结构

### TtsRequest

```text
requestId: string
bookId: string
chapterId: string
text: string
language: "zh-CN" | "en-US"
voiceId: string
speed: number
sampleRate: number
codec: "wav" | "mp3" | "opus"
```

### TtsSegment

```text
segmentId: string
index: number
startChar: number
endChar: number
textSha256: string
audioUri: string
durationMs: number
sizeBytes: number
audioSha256: string
```

### TtsArtifact

```text
artifactId: string
bookId: string
chapterId: string
engineId: string
engineVersion: string
modelId: string
modelVersion: string
language: string
voiceId: string
speed: number
sampleRate: number
channels: 1
codec: string
segments: TtsSegment[]
totalDurationMs: number
totalSizeBytes: number
complete: boolean
artifactSha256: string
```

### PlaybackState

在现有播放状态基础上增加：

```text
sourceType: "audio" | "tts-artifact"
artifactId: string | null
segmentIndex: number
positionMs: number
```

播放进度以音频时间为准；文本高亮或文字进度通过当前分段的 `startChar/endChar` 映射。

## 6. 接口设计

手机/电脑侧：

```text
OfflineTtsEngine.loadModel(modelPath) -> EngineInfo
OfflineTtsEngine.synthesize(request) -> TtsArtifact
OfflineTtsEngine.cancel(requestId)
OfflineTtsEngine.release()
```

传输侧：

```text
TransferManager.beginArtifact(manifest)
TransferManager.sendSegment(segmentId, bytes)
TransferManager.finishArtifact(artifactSha256)
TransferManager.cancel(artifactId)
```

手表侧：

```text
WatchAudioPlayer.prepare(artifactId, segmentIndex)
WatchAudioPlayer.play()
WatchAudioPlayer.pause()
WatchAudioPlayer.seek(positionMs)
WatchAudioPlayer.stop()
WatchAudioPlayer.release()
```

实现时，TTS 引擎、传输层和 BlueOS 播放器不得相互直接调用，必须通过上述数据结构和适配器连接。

## 7. 文本分段规则

1. 统一换行符，删除无法朗读的 HTML/控制字符。
2. 优先按“。！？；”和段落边界分段。
3. 单段超过配置上限时，再按逗号、空格或字符边界切分。
4. 不拆开数字、小数、英文单词和常见缩写。
5. 每段保留原文字符区间，确保播放进度可映射回原文。
6. 单次合成只处理一个 segment，避免生成队列失控；分段上限通过手机性能测试确定。

## 8. 音频格式策略

- 引擎内部统一使用 PCM 作为中间结果。
- 首版优先生成一种手表确认支持的文件格式，再接入传输。
- BlueOS 官方示例展示了本地 MP3 URI 和 PCM `AudioTrack` 两条播放路径，但没有在公开页面完整列出 WATCH GT 的所有文件格式限制。
- 因此先验证 MP3 本地播放；如果目标设备不支持或兼容性不稳定，则改为 WAV/PCM 或在手表端使用 AudioTrack。
- 采样率、编码率和声道数写入 `TtsArtifact`，禁止只靠文件扩展名判断。

## 9. 异常处理

| 异常 | 处理 |
|---|---|
| 文本为空或只含不可朗读字符 | 拒绝请求并提示用户 |
| 模型不存在或版本不匹配 | 不开始合成，提示安装模型 |
| 手机内存不足 | 取消当前 segment，释放引擎，保留已完成结果 |
| 合成失败 | 删除未完成临时文件，允许重试 |
| 手表空间不足 | 不加入书架，提示清理空间 |
| 蓝牙中断 | 保留已确认分段，支持重传 |
| SHA-256 不匹配 | 丢弃临时文件，不更新索引 |
| 音频格式不支持 | 标记 artifact 不可播放，记录设备日志 |
| 应用退出或升级 | 只恢复 `complete=true` 的 artifact |
| 手表没有手机可连接 | 已传输内容照常播放；新文字显示“需要先生成语音” |

所有音频写入使用临时文件，只有完整接收并通过校验后才改名为最终文件并更新索引。

## 10. 目录设计

后续实现目标：

```text
mobile/
  app/
  tts/
    OfflineTtsEngine.kt
    SherpaOnnxTtsEngine.kt
    TextSegmenter.kt
    TtsArtifactStore.kt

tools/tts/
  README.md
  generate_audio.py
  models.lock.json

my-application-1/src/
  services/
    audio/
      watchAudioPlayer.js
      artifactStore.js
    transfer/
      transferManager.js
  models/
    ttsArtifact.js
    playbackState.js
```

第一版可以先在 `tools/tts/` 完成离线生成和格式验证，再接入 Android 手机端，降低 BlueOS 调试成本。

## 11. 测试方案

### 单元测试

- 文本规范化和分段边界。
- 中英文、数字和标点处理。
- artifact 缓存键稳定性。
- 元数据序列化和 SHA-256。
- 不完整 artifact 不得进入可播放索引。

### 主机集成测试

- 在关闭网络的环境下加载本地模型。
- 用固定中文文本生成音频。
- 检查文件可解码、时长大于 0、采样率和声道符合元数据。
- 重复生成相同请求命中缓存。
- 模拟空间不足、取消和模型加载失败。

### 传输集成测试

- 分片、断点续传、重复包、乱序、断线重连。
- 完成前手表不可见，完成后一次性可见。
- 修改一个字节后必须被 SHA-256 拒绝。

### WATCH GT 验收

- 手表和手机均关闭网络。
- 播放已传输的中文语音。
- 暂停、继续、切段、快进和退出重启。
- 息屏后继续播放。
- 删除和重新传输。
- 记录 BlueOS 版本、设备型号、音频格式、模型版本、生成耗时和播放结果。

## 12. Acceptance Criteria

V1 离线 TTS 闭环完成的条件：

1. 在无网络的手机或电脑上，使用仓库记录的模型生成固定中文样例。
2. 生成结果包含完整的 `TtsArtifact` 和 SHA-256。
3. 通过传输协议把样例传到 WATCH GT。
4. 关闭手机网络和手表网络后，手表仍能播放样例。
5. 播放页可以暂停、继续、切换 segment，并在重启后恢复位置。
6. 传输中断、校验失败和空间不足不会产生可见的半成品。
7. 仓库中没有 appKey、签名私钥或未授权的第三方模型文件。
8. 生成耗时、模型体积、音频体积和播放兼容性形成测试记录。

Native TTS 不属于 V1 的完成条件。若后续要实现“手表独立接收新文本并立即离线合成”，必须单独完成 Native SDK 可用性和资源预算评审。
