# BlueOS 听书与 TTS 参考资料

更新时间：2026-09-01

## 结论

目前没有找到同时满足 BlueOS、vivo WATCH GT、中文听书和手表端离线神经 TTS 的完整开源工程。

本项目 V1 不在手表上部署 TTS 模型，而采用：

1. 手表在线且真实网络探测成功时，调用 BlueOS 官方 TTS。
2. 将音频按约 5 分钟分段写入手表本地缓存。
3. 缓存维持当前播放位置之后约 30 分钟。
4. 断网后只播放已经完成的本地音频，重连后继续预取。
5. 如果 WATCH GT 通过手机蓝牙网络无法直连官方 TTS，再增加手机端 provider 和已有蓝牙传输协议。

因此，BlueOS 官方 TTS 是“联网预取”依赖，不是“离线播放”依赖；离线播放依赖本地音频文件和 BlueOS 播放 API。

## BlueOS 官方资料

### 语音技术

[BlueOS 语音技术](https://developers-watch.vivo.com.cn/api/ai/speech/)

官方提供 `@blueos.ai.speech` 和 `createTts`，支持长文本模型、音频 chunk 回调和直接播放相关能力。公开文档显示它依赖 WebSocket 和 vivo AI 平台的 `appId/appKey`，所以只能在网络可用时用于预取。

实现时必须：

- 先通过真实 TTS 请求确认网络可用，不能只看 `bluetooth` 网络类型。
- 将凭据通过安全配置或构建注入，不提交到仓库。
- 串行提交文本，处理正在合成、断网、鉴权和服务错误。
- 记录实际返回的编码格式、采样率、声道和时长。

### 网络管理

[BlueOS 网络管理](https://developers-watch.vivo.com.cn/api/system/network/)

官方提供网络类型查询和网络变化订阅。网络类型可包括 `bluetooth`、`wifi`、`4g`、`5g`、`none` 等。

注意：蓝牙连接不等于互联网可用。缓存服务应使用“网络事件 + 实际 probe”两层判断。

### 本地文件

[BlueOS 文件存储](https://developers-watch.vivo.com.cn/api/storage/file/?hastopwindow=1)

官方文件 API 使用 URI，不使用绝对路径，支持：

- `internal://cache/...` 临时文件
- `internal://files/...` 持久文件
- `writeArrayBuffer` 分块写入
- `readArrayBuffer`、`list`、`delete`
- `move` 将完整文件提升到最终 URI

预取必须先写临时文件，完成接收、长度/哈希/格式校验后再移动并更新索引，避免半成品出现在播放队列。

### 本地音频

[BlueOS 多媒体能力](https://developers-watch.vivo.com.cn/api/system/media/)

官方 `AudioPlayer` 支持本地 URI，例如 `internal://files/a.mp3`，并提供播放、暂停、停止、进度、完成和错误回调。官方也提供 `AudioTrack` 的 PCM 流写入路径。

公开页面没有完整列出 WATCH GT 对所有编码格式的限制，因此必须在真机上验证 TTS 输出格式。30 分钟长期缓存优先采用实际验证过的压缩音频，不能未经测量直接使用大体积 PCM。

### 后台运行

[BlueOS 后台运行](https://developers-watch.vivo.com.cn/reference/extend/resident/)

音频/网络持续任务需要按官方后台规则配置 feature，并将生命周期较长的逻辑放到 `app.ux` 或要求的常驻入口，不绑定某个页面。是否允许网络预取在息屏时持续运行，必须通过 WATCH GT 真机测试确认。

### Manifest 和快速开始

- [BlueOS Manifest](https://developers-watch.vivo.com.cn/reference/configuration/manifest/)
- [BlueOS 快速开始](https://developers-watch.vivo.com.cn/reference/quickstart/quick-start)

Manifest 可使用 `audiobooks` 应用分类，设备类型和 `designWidth: 466` 需要结合现有工程校验。TTS/网络/文件/音频依赖必须以实际 SDK 能解析的 feature 名称为准。

### Native API 边界

[BlueOS Native API 概述](https://developers-watch.vivo.com.cn/native/quickstart/introduction/)

官方说明 BlueOS 有 C/C++ Native API，但当前 Native 能力存在定向合作边界。普通 BlueOS JS 应用不能假设可以直接加载任意 C/C++ TTS 动态库或 Node.js addon。

手表端 Native TTS 作为 V2 预研，不阻塞 V1 的联网预缓存和离线播放。

## 离线 TTS 工程参考

这些项目用于备用手机 provider 或未来 Native PoC，不是 V1 的必需依赖。

### sherpa-onnx

[sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx)  
[sherpa-onnx TTS 文档](https://k2-fsa.github.io/sherpa/onnx/tts/index.html)

适合作为手机/电脑侧的离线 TTS 候选：

- Apache-2.0 运行时。
- 支持离线 TTS、Android、C/C++ 和嵌入式平台。
- 提供中文 Matcha、VITS 等模型路线。
- 可在没有网络时生成音频，再交给传输层。

运行时许可证和模型许可证必须分别记录；模型不直接提交到 Git 仓库。

### Piper

[Piper 原始仓库](https://github.com/rhasspy/piper)  
[Piper 后续仓库](https://github.com/OHF-Voice/piper1-gpl)

可作为手机端神经 TTS 备选，但后续仓库标注 GPL-3.0，代码和模型引入前必须完成许可证审查。

### eSpeak NG

[eSpeak NG](https://github.com/espeak-ng/espeak-ng)

体积较小、C 实现，适合验证 Native TTS 的最小可行性；但使用 formant synthesis，中文听书自然度可能不满足最终要求，且许可证为 GPL-3.0-or-later。

## 听书播放器参考

- [Voice](https://github.com/PaulWoitaschek/Voice)：参考书籍、章节、续播、睡眠定时器、倍速和书签。GPL-3.0，仅参考架构和交互。
- [Audiobook](https://github.com/sunil-dhaka/Audiobook)：参考轻量离线书架、目录扫描和续播。仓库标注 MIT，仍需保留版权信息。
- [BookPlayer](https://github.com/TortugaPower/BookPlayer)：参考播放器控制、播放队列和位置管理。GPL-3.0，仅参考设计。
- [watch-demo](https://github.com/Star7-Github/watch-demo)：参考 BlueOS 工程目录、manifest 和页面路由。仓库标注 MIT。

## 许可证和安全规则

- 不直接复制 GPL 工程代码到本项目。
- 运行时、模型、词典和音频样例分别检查许可证。
- 引入第三方源码时保留版权和许可证文件。
- 不把第三方模型大文件直接提交到 Git，使用下载脚本、版本号和 SHA-256 固定模型。
- 不提交 vivo AI 凭据、签名私钥或手机端用户内容。
