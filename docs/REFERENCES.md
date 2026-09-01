# 离线 TTS 参考资料

更新时间：2026-09-01。

## 结论

目前没有找到同时满足 BlueOS、vivo WATCH GT、中文听书和离线 TTS 的完整开源工程。

本项目采用分层参考：

1. BlueOS 官方 API：确认手表端本地音频播放、后台播放和 Native API 边界。
2. sherpa-onnx：作为手机/电脑侧的离线 TTS 候选运行时。
3. Piper：作为本地神经 TTS 的备选实现和模型生态参考。
4. eSpeak NG：作为极小体积、可移植的手表端离线 TTS 可行性验证候选。
5. Voice、Audiobook 和 BookPlayer：参考听书播放器的数据模型和交互。

第一版的目标是：在手机或电脑无网络的情况下生成语音文件，传输到手表后，手表断网仍能播放。BlueOS 云端 TTS 只保留为调试和对照方案，不作为离线功能依赖。

## BlueOS 官方资料

### 语音技术

[BlueOS 语音技术](https://developers-watch.vivo.com.cn/api/ai/speech/)

官方提供 `@blueos.ai.speech` 和 `createTts`，支持短文本和长文本模型。但该接口依赖 `blueos.network.webSocket`，并要求 vivo AI 平台的 `appId/appKey`，因此属于联网 TTS，不能满足手表无网络时即时合成的要求。

### 本地音频播放

[BlueOS 多媒体能力](https://developers-watch.vivo.com.cn/api/system/media/)

官方音频 API 支持：

- `AudioPlayer` 播放本地 URI，例如 `internal://files/a.mp3`
- `pause()`、`stop()`、`release()`
- `currentTime` 和 `duration`，可用于续播和进度保存
- `AudioTrack` 写入 PCM 音频流

因此，离线方案的手表端只需要保存并播放已经生成好的本地音频。

### 后台播放

[BlueOS 后台运行](https://developers-watch.vivo.com.cn/reference/extend/resident/)

音频应用需要在 manifest 中声明后台运行能力。官方列出的音频后台 feature 包括：

- `blueos.multimedia.audio`
- `blueos.multimedia.media`

实际使用时以 BlueOS Studio 和 WATCH GT 目标系统支持的接口为准。

### Native API 边界

[BlueOS Native API 概述](https://developers-watch.vivo.com.cn/native/quickstart/introduction/)

官方文档说明 BlueOS 有 C/C++ Native API，但目前开放的 Native 开发能力以定向合作形式提供。由此判断，普通 JS 应用不能直接假设可以加载任意 C/C++ TTS 动态库或 Node.js addon。手表端神经 TTS 必须先完成 Native SDK、编译、模型加载和音频输出可行性验证。

## 离线 TTS 工程

### sherpa-onnx

[sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx)

[sherpa-onnx TTS 文档](https://k2-fsa.github.io/sherpa/onnx/tts/index.html)

适合作为手机/电脑侧第一候选：

- Apache-2.0 项目
- 支持离线 TTS
- 提供 C/C++、Android 等接口
- 有中文模型，包括 Matcha、VITS、Kokoro 和 ZipVoice 路线
- 官方示例包含异步生成和实时播放
- 不需要把模型和推理运行时放进 BlueOS JS 应用

首版先评估中文 Matcha/VITS 模型的音质、模型体积和手机端生成速度。模型文件的许可证要单独确认，不能只看运行时许可证。

### Piper

[Piper 原始仓库](https://github.com/rhasspy/piper)

[Piper 后续仓库](https://github.com/OHF-Voice/piper1-gpl)

Piper 是本地神经 TTS，提供 C/C++ API 和多种语音模型。原始仓库已经将开发迁移到后续仓库；后续仓库标注 GPL-3.0。它可以作为候选引擎，但必须在引入代码或模型前单独审查许可证和中文模型质量。

### eSpeak NG

[eSpeak NG](https://github.com/espeak-ng/espeak-ng)

适合作为手表端极小规模 PoC：

- C 语言实现
- 支持共享库和 WAV 输出
- 官方称程序和语言数据总量为几 MB 级别
- 支持 Android 和多种 POSIX 平台
- GPL-3.0-or-later
- 使用 formant synthesis，体积小、速度快，但自然度明显低于神经 TTS

它更适合验证“BlueOS Native API 能否运行离线 TTS”这一技术问题，不适合作为最终中文听书音质的默认方案。

## 听书播放器参考

- [Voice](https://github.com/PaulWoitaschek/Voice)：参考书籍、章节、续播、睡眠定时器、倍速和书签。项目为 GPL-3.0，只参考架构和交互。
- [Audiobook](https://github.com/sunil-dhaka/Audiobook)：参考轻量离线书架、目录扫描和每本书续播。仓库标注 MIT，仍需保留版权信息。
- [BookPlayer](https://github.com/TortugaPower/BookPlayer)：参考播放器控制、播放队列和位置管理。项目为 GPL-3.0，只参考设计。
- [watch-demo](https://github.com/Star7-Github/watch-demo)：参考 BlueOS 工程目录、manifest 和页面路由。仓库标注 MIT。

## 许可证规则

- 不直接复制 GPL 工程代码到本项目。
- 运行时、模型、词典和音频样例分别检查许可证。
- 引入第三方源码时保留版权和许可证文件。
- 不把第三方模型大文件直接提交到 Git 仓库，使用下载脚本、版本号和 SHA-256 固定模型。
