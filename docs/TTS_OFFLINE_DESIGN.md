# 在线预缓存与离线播放设计

状态：Proposal，等待评审后冻结  
版本：0.2  
更新时间：2026-09-01  
目标设备：vivo WATCH GT（BlueOS）

## 1. 决策

V1 采用“联网时预取语音、断网时播放本地缓存”：

1. 手表在线且通过真实探测确认可访问 TTS 时，读取当前章节正文并分段。
2. 使用 BlueOS 官方 TTS 生成后续音频 segment。
3. 音频先写入临时 URI，完整接收并校验后再移动到持久 URI。
4. 本地缓存保持当前播放位置之后约 30 分钟。
5. 离开手机或网络断开后，停止新的合成，只播放已经完成的本地 segment。
6. 重新联网并通过探测后，继续补齐缓存。

这满足“手表不一定有网络”这一约束，同时避免 V1 在手表上部署 TTS 模型。

## 2. V1 边界

### 包含

- BlueOS 网络状态监听和真实 TTS connectivity probe。
- 章节正文读取、文本规范化和按时长目标分段。
- 官方 TTS 音频 chunk 到本地文件的可靠写入。
- 本地音频播放、暂停、继续、跳转、切章和续播。
- 约 30 分钟滚动缓存，低于约 5 分钟时继续预取。
- 断网保留已完成缓存，重连后继续。
- 缓存索引、播放进度、空间上限和异常清理。
- 模拟器/主机 mock 测试和 WATCH GT 真机记录。

### 不包含

- 手表端 Native TTS 或神经模型推理。
- 无手机、无网络时对新文字即时合成。
- 没有先验证直连路径就开发完整 Android 手机 TTS 应用。
- 任何私有凭据、签名私钥或第三方模型文件入库。

如果 T0 证明 WATCH GT 通过手机蓝牙网络不能访问官方 TTS，再实现手机端 provider；手机端 provider 是传输备用路径，不改变手表播放和缓存模型。

## 3. 官方能力与待验证项

使用以下 BlueOS 能力，具体 feature 名称以目标 SDK 解析结果为准：

- [BlueOS 语音技术](https://developers-watch.vivo.com.cn/api/ai/speech/)：`@blueos.ai.speech`、`createTts`、长文本模型和音频 chunk 回调。
- [BlueOS 网络管理](https://developers-watch.vivo.com.cn/api/system/network/)：`network.getType()`、`network.subscribe()`。
- [BlueOS 文件存储](https://developers-watch.vivo.com.cn/api/storage/file/?hastopwindow=1)：URI 文件、`writeArrayBuffer`、`readArrayBuffer`、`move`、`list` 和删除。
- [BlueOS 多媒体](https://developers-watch.vivo.com.cn/api/system/media/)：本地 `AudioPlayer`、播放状态、进度、完成和错误回调。
- [BlueOS 后台运行](https://developers-watch.vivo.com.cn/reference/extend/resident/)：将需要持续运行的任务放到 `app.ux` 或官方要求的常驻入口。

manifest 至少需要按 SDK 核对以下依赖：

```text
blueos.network.networkManager
blueos.storage.file
blueos.network.webSocket
blueos.media.audio.mediaManager
```

需要在 T0 真机确认：

- `bluetooth` 网络类型是否能够提供可用互联网，而不只是表示手机已连接。
- TTS 音频 chunk 的实际编码格式、采样率和声道。
- WATCH GT 是否能用 `AudioPlayer` 播放该格式。
- 30 分钟缓存的实际空间占用和息屏连续播放行为。
- 页面生命周期结束后，预取和播放任务能否按官方规则继续。

网络类型只能作为启动条件，最终以真实 TTS probe 或等价网络请求为准。

## 4. 架构

```text
Chapter text
  -> TextSegmenter
  -> PrefetchManager
  -> TtsProvider
  -> temporary file writer
  -> validation
  -> atomic promotion
  -> CacheIndex
  -> WatchAudioPlayer
```

组件职责：

- `TextSegmenter)：规范化正文，按标点和长度切分，保留原文字符范围。
- `NetworkProbe)：监听网络变化并验证 TTS endpoint 是否可用。
- `TtsProvider)：屏蔽官方 TTS 和未来手机 provider 的差异。
- `PrefetchManager)：按播放位置维护滚动缓存，串行调度生成。
- `CacheStore)：写临时文件、校验、原子移动、索引和空间清理。
- `WatchAudioPlayer)：只负责本地 URI 播放和播放状态。
- `PlaybackStore)：保存当前书籍、segment 和音频毫秒位置。

页面只调用业务服务，不直接操作 TTS SDK、文件 URI 或网络事件。

## 5. 缓存策略

默认配置：

```js
{
  segmentTargetMs: 300000,
  targetAheadMs: 1800000,
  lowWatermarkMs: 300000,
  maxConcurrentSynthesis: 1
}
```

- segment 目标约 5 分钟；实际时长以音频结果为准。
- `readyAheadMs` 统计当前播放位置后所有完整、可播放 segment，允许跨章节。
- `readyAheadMs < lowWatermarkMs` 且 probe 成功时启动预取。
- `readyAheadMs >= targetAheadMs` 时暂停预取。
- TTS 合成严格串行，避免官方“正在合成时不能提交新文本”的错误。
- 同一个缓存键已经为 `ready` 时不得重复请求。
- 当前播放 segment 和下一个待播放 segment 不得被淘汰。
- 只淘汰更早的 `expired` segment；空间不足时先清理旧书籍/旧章节，并提示用户。
- 网络断开时不删除 ready segment。

长期缓存优先使用已验证的压缩音频格式。PCM 可以作为调试或流播放路径，但不能在未测量空间预算的情况下作为 30 分钟持久缓存格式。

## 6. 数据结构

### Chapter

```js
{
  id: "chapter-1",
  title: "第一章",
  text: "章节正文……",
  textUri: null
}
```

V1 至少支持 `text`；正文很大时才使用 `textUri`。

### CacheSegment

```js
{
  id: "book-1:chapter-1:0",
  bookId: "book-1",
  chapterId: "chapter-1",
  sequence: 0,
  textStart: 0,
  textEnd: 1200,
  textSha256: "...",
  uri: "internal://files/tts/book-1/chapter-1/0000.mp3",
  durationMs: 300000,
  sizeBytes: 7200000,
  audioSha256: "...",
  format: "mp3",
  sampleRate: 24000,
  channels: 1,
  status: "ready"
}
```

状态流转：

```text
downloading -> ready -> playing -> expired
downloading -> deleted
```

只有 `ready` 和当前 `playing` segment 可以进入播放队列。

### CacheState

```js
{
  schemaVersion: 1,
  bookId: "book-1",
  currentSegmentId: "book-1:chapter-1:0",
  currentPositionMs: 12000,
  targetAheadMs: 1800000,
  lowWatermarkMs: 300000,
  readyAheadMs: 1790000,
  segments: []
}
```

### PlaybackState

```js
{
  bookId: "book-1",
  chapterId: "chapter-1",
  segmentId: "book-1:chapter-1:0",
  positionMs: 12000,
  isPlaying: false,
  sourceType: "cache-segment"
}
```

## 7. 接口

### TtsProvider

```js
probe() -> Promise<{ reachable: boolean, reason: string }>

synthesize(segment, options) -> Promise<{
  requestId: string,
  audioChunks: AsyncIterable<ArrayBuffer>,
  format: "mp3" | "wav" | "pcm" | "opus",
  sampleRate: number,
  channels: number
}>

cancel(requestId) -> Promise<void>
```

首选实现 `BlueosOnlineTtsProvider`：

- 使用 `@blueos.ai.speech`。
- 长文本使用 `TtsModel.LongDefault`。
- 使用不直接播放的模式接收音频 chunk。
- 认证配置从安全配置/构建注入，不写入 Git。

备用实现 `PhonePrefetchProvider` 只在 T0 失败后单独开发。

### CacheStore

```js
begin(segment) -> Promise<TempHandle>
append(tempHandle, chunk) -> Promise<void>
complete(tempHandle, metadata) -> Promise<CacheSegment>
remove(segmentId) -> Promise<void>
listReady(bookId) -> Promise<CacheSegment[]>
evict(policy) -> Promise<void>
```

写入流程：

```text
internal://cache/tts/... 
  -> 分块写入
  -> 记录字节数和哈希
  -> 读取/格式/时长校验
  -> file.move
  -> 更新 CacheIndex
```

更新索引必须发生在最终文件可读之后；错误时删除临时文件和不完整最终文件。

### WatchAudioPlayer

```js
prepare(uri, positionMs)
play()
pause()
resume()
seek(positionMs)
stop()
release()
onTimeUpdate(callback)
onEnded(callback)
onError(callback)
```

播放器不负责联网，也不负责生成语音。

### PrefetchManager

```js
start(bookId)
pause(reason)
resume()
onNetworkChanged(status)
getState() -> CacheState
dispose()
```

内部每次只处理一个 segment，响应播放位置、网络事件、TTS 完成和存储错误。

## 8. 断网与重连行为

### 断网

1. `NetworkProbe` 标记不可达。
2. 取消或等待当前 TTS 请求安全结束。
3. 不再创建新的下载/合成请求。
4. 保留所有完整 ready segment。
5. 播放器继续消费本地队列。
6. UI 显示“离线”和剩余可播放时间。

### 重连

1. 收到网络变化后不能直接恢复。
2. 执行真实 probe。
3. probe 成功且余量低于目标时恢复串行预取。
4. probe 失败时退避重试，不影响本地播放。

网络抖动不得造成并发 TTS、重复 segment 或请求风暴。

## 9. 异常处理

| 异常 | 处理 |
|---|---|
| 正文为空 | 跳过该章节并记录原因 |
| probe 失败/鉴权失败 | 停止预取，保留本地缓存，显示可操作错误 |
| TTS 合成失败 | 删除临时文件，按退避策略重试 |
| TTS 被取消 | 删除临时文件，不写入 ready |
| 网络断开 | 停止新请求，继续播放已有缓存 |
| 文件写入失败 | 删除临时文件，保留旧缓存 |
| 空间不足 | 清理旧缓存；仍不足则暂停预取并提示 |
| 格式不支持 | 不加入播放队列，记录格式/采样率/设备信息 |
| 哈希/长度不匹配 | 丢弃文件，不更新索引 |
| 应用重启 | 仅恢复索引中完整且可读的 segment |
| 播放文件丢失 | 标记 segment 失效，跳到下一个 ready segment |

## 10. 目录建议

```text
my-application-1/src/
  app.ux
  models/
    book.js
    chapter.js
    cacheSegment.js
    playbackState.js
  services/
    network/
      networkProbe.js
    tts/
      ttsProvider.js
      blueosOnlineTtsProvider.js
      prefetchManager.js
      textSegmenter.js
    storage/
      cacheStore.js
      cacheIndex.js
    audio/
      watchAudioPlayer.js
```

实际目录应适配仓库现有结构，但职责边界不能合并回页面代码。

## 11. 测试

### 单元测试

- 文本规范化、分段和字符范围。
- 缓存键、元数据序列化和 schemaVersion。
- `readyAheadMs` 计算和跨章节队列。
- 0/5/30 分钟阈值状态机。
- 重复事件、取消、重试、退避和淘汰策略。
- 半成品、损坏索引、空间不足和丢失文件。

### Mock 集成测试

- mock TTS chunk → 临时文件 → 校验 → ready。
- mock 网络断开 → 停止预取 → 本地播放继续。
- mock 重连 → probe 成功 → 预取恢复。
- mock 播放完成 → 自动切到下一个 segment。
- CI 不依赖 vivo AI 凭据、真实网络或 WATCH GT。

### 真机验收

记录：

- WATCH GT 型号和 BlueOS 版本。
- BlueOS Studio/SDK 版本。
- 手机型号和网络类型。
- TTS 音频格式、采样率、声道、单段大小。
- 30 分钟缓存总大小。
- 断开手机后的连续播放时长。
- 息屏、暂停/继续、重启续播和重连结果。

## 12. Acceptance Criteria

V1 闭环完成必须满足：

1. 手表连接手机网络后，真实 probe 成功并自动开始预取。
2. 缓存达到约 30 分钟后暂停，余量低于约 5 分钟后继续补充。
3. 关闭手机网络/断开手机后，已完成缓存仍可连续播放约 30 分钟。
4. 播放页支持暂停、继续、跳转、切章和 segment 自动衔接。
5. 断网、重连、应用重启后，完整文件和播放位置不丢失。
6. 任何失败、取消、断线或校验错误都不会产生可播放半成品。
7. CI 不需要网络和私有凭据即可通过 mock 测试。
8. WATCH GT 真机测试记录音频兼容性、缓存大小和已知限制。

“手表独立接收新文字并立即离线合成”不属于 V1 Acceptance Criteria，后续另立 Native TTS 预研任务。
