# 在线预缓存与离线播放任务单

状态：Ready for Codex implementation  
目标设备：vivo WATCH GT（BlueOS）  
目标：手表联网时自动生成并缓存约 30 分钟语音，离开手机或断网后继续播放本地缓存。

## 1. V1 范围

### 必须完成

- 手表能判断当前网络状态，并通过真实 TTS 请求确认“确实可联网”。
- 手表在线时，把当前章节及后续章节文本分段提交给 BlueOS TTS。
- TTS 音频以分段文件保存到手表本地。
- 缓存达到约 30 分钟后停止预取，只在低于 5 分钟时继续补充。
- 断网后停止新的 TTS 请求，但保留并播放已经完成的缓存。
- 播放、暂停、继续、跳转、切章和退出重启后续播正常。
- 临时文件只有在完整写入并校验通过后才能进入可播放索引。

### V1 不做

- 不在手表上部署 sherpa-onnx、Piper 或 eSpeak NG。
- 不把“手表无手机、无网络时接收新文字并立即神经合成”作为 V1 目标。
- 不先开发复杂的 Android 手机 TTS 应用；只有当手表通过手机网络无法直接访问 TTS 时，才执行备用任务。
- 不把 vivo AI 的 `appId`、`appKey`、签名私钥或模型文件提交到仓库。

## 2. 固定参数和数据契约

首版使用配置项，默认值如下：

```js
{
  segmentTargetMs: 300000,  // 约 5 分钟一个文件
  targetAheadMs: 1800000,   // 目标预缓存约 30 分钟
  lowWatermarkMs: 300000,   // 可播放余量低于 5 分钟时补充
  maxConcurrentSynthesis: 1
}
```

官方 TTS 在合成期间不能并发提交新的文本，因此首版串行生成 segment。参数必须集中在配置文件，不能散落在页面代码中。

### Chapter

在现有书籍模型中补充章节正文，二选一：

```js
{
  id: "chapter-1",
  title: "第一章",
  text: "章节正文……",
  textUri: null
}
```

如果正文较大，可使用 `textUri` 读取本地文本，但 V1 必须至少支持 `text`。

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
  status: "ready"
}
```

允许的状态：

`downloading` → `ready` → `playing` → `expired`

失败或取消时删除临时文件，不能把失败状态写成可播放文件。

### CacheState

```js
{
  bookId: "book-1",
  currentSegmentId: "book-1:chapter-1:0",
  currentPositionMs: 12000,
  targetAheadMs: 1800000,
  lowWatermarkMs: 300000,
  readyAheadMs: 1790000,
  segments: []
}
```

`readyAheadMs` 只统计当前播放位置之后、状态为 `ready` 或正在播放的完整 segment；跨章节连续计算。

### TtsProvider

缓存管理器只依赖适配器，不直接依赖页面或具体 TTS SDK：

```js
{
  probe(): Promise<{ reachable: boolean, reason: string }>,
  synthesize(segment, options): Promise<{
    audioChunks: AsyncIterable<ArrayBuffer>,
    format: "mp3" | "wav" | "pcm" | "opus",
    sampleRate: number,
    channels: number
  }>,
  cancel(requestId): Promise<void>
}
```

V1 首选 `BlueosOnlineTtsProvider`，使用官方 `@blueos.ai.speech`。如果 WATCH GT 通过手机蓝牙网络不能真正访问 TTS，再单独实现 `PhonePrefetchProvider`，不得把两条路径揉成页面逻辑。

## 3. 执行顺序

每项任务单独一个 PR。当前 PR 合并后才能开始下一项；每个 PR 必须包含测试和 Acceptance Criteria 记录。

### T0：确认设备网络和 BlueOS API

目标：先证明“手表使用手机网络时能否直接调用 TTS”。

工作内容：

- 核对并按 SDK 实际要求更新 `manifest.json`：
  - `blueos.network.networkManager`
  - `blueos.storage.file`
  - `blueos.network.webSocket`
  - `blueos.media.audio.mediaManager`
  - 后台运行所需 feature 以官方 SDK/目标设备结果为准。
- 新增最小探测页面或调试入口：
  - 读取 `network.getType()`；
  - 订阅网络变化；
  - 发起真实、短文本 TTS probe；
  - 记录成功、超时、鉴权失败和断网错误。
- 不得仅因网络类型为 `bluetooth` 就判定有互联网。
- 在文档中记录 BlueOS Studio、SDK、WATCH GT 和手机网络测试结果。

测试：

- 模拟 `wifi`、`bluetooth`、`none`、超时和 TTS 错误。
- 真机分别测试 Wi-Fi、手机网络、断开手机和重新连接手机。

Acceptance Criteria：

- 明确记录 WATCH GT 是否能通过手机网络访问官方 TTS。
- probe 失败时不会创建空文件、不会阻塞播放页。
- manifest 能被 BlueOS Studio 解析。

### T1：章节正文、缓存模型和持久化索引

目标：让预取逻辑有真实输入和稳定的数据模型。

工作内容：

- 将页面里的硬编码章节信息改为 `Book/Chapter` 数据。
- 实现文本规范化和按标点/长度分段，保留 `textStart`/`textEnd`。
- 实现 `CacheSegment`、`CacheState` 序列化和缓存键。
- 为缓存索引定义版本号，兼容字段缺失和旧版本清理。
- 只把完整 segment 写入 ready 索引。

测试：

- 中英文、数字、标点、空文本和超长文本。
- 相同书籍/章节/文本/声音参数生成稳定缓存键。
- 半成品、损坏 JSON 和旧版本索引不会进入播放队列。

Acceptance Criteria：

- 至少一章真实正文可以被分成多个 segment。
- 重启后可读取完整缓存索引，半成品不会显示在书架或播放队列。

### T2：真实本地音频播放

目标：先脱离 TTS 验证“断网仍能播放文件”。

工作内容：

- 实现 `WatchAudioPlayer`，封装 BlueOS `AudioPlayer`：
  `prepare`、`play`、`pause`、`resume`、`seek`、`stop`、`release`。
- 支持完成、进度和错误回调。
- 用仓库不含版权问题的短 MP3 测试文件或设备已有本地文件。
- 播放页使用播放器状态，不再只修改 UI 模拟状态。

测试：

- 播放、暂停、继续、跳转、自然结束、文件不存在和格式错误。
- 播放过程中关闭网络，确认播放不被网络状态强制停止。

Acceptance Criteria：

- 音频已经在本地时，关闭手机和手表网络仍可播放。
- 退出并重新进入播放页，状态与音频位置一致。

### T3：单个 segment 的在线 TTS 到本地文件闭环

目标：只做一个短文本，验证官方 TTS、文件写入和本地播放兼容性。

工作内容：

- 使用 `TtsModel.LongDefault` 合成一段固定中文文本。
- 设置不直接播放，接收 TTS 音频 chunk。
- 以 `internal://cache/...` 临时 URI 分块写入，完成后校验大小/哈希，再移动到 `internal://files/...`。
- 记录真实音频格式、采样率、声道、时长和大小。
- 优先验证压缩格式用于长期缓存；不要默认把 30 分钟 PCM 写入持久缓存。
- 若 TTS chunk 是 PCM/其他格式，先做格式兼容性实验，再决定是否转码；不得假设扩展名等于真实编码。

测试：

- 正常合成、TTS 中断、网络断开、文件写入失败、空间不足和哈希不匹配。
- 成功文件断网播放，半成品文件不可见。

Acceptance Criteria：

- 一个完整中文 segment 能保存为本地文件并在断网后播放。
- 任一失败路径都清理临时文件且不污染 ready 索引。
- 在文档中写明 WATCH GT 实际可播放的格式和存储大小。

### T4：滚动预缓存约 30 分钟

目标：把单 segment 扩展为自动保持播放前方缓存。

工作内容：

- 实现 `PrefetchManager` 状态机：
  - 当前余量低于 5 分钟时启动；
  - 目标补到约 30 分钟时暂停；
  - 一次只生成一个 segment；
  - 生成失败可重试，但不能重复生成同一个已 ready segment。
- 先生成当前章节剩余内容，再跨到下一章节。
- 播放队列只消费完整 ready segment。
- 清理策略不能删除当前播放 segment 和即将播放 segment；只淘汰更早的过期 segment。
- 存储上限必须可配置，接近上限时先淘汰旧缓存并给出提示。

测试：

- 从 0、4、5、29、30 分钟余量启动状态机。
- 跨章节、重复事件、快速暂停/继续和连续完成回调。
- 模拟 TTS 慢、失败、取消、重复请求和空间不足。

Acceptance Criteria：

- 在线状态下可连续生成并维持约 30 分钟可播放余量。
- 不出现重复 segment、并发 TTS 请求或超出存储上限的无限增长。
- 预取失败不会影响已经缓存内容的播放。

### T5：断网、重连、后台和续播

目标：让“离开手机还能听”成为稳定行为。

工作内容：

- 断网时立即停止新的合成请求，保留 ready segment，显示剩余可播放时间。
- 重连后先执行真实 probe，成功后恢复预取。
- 不把蓝牙连接事件当作互联网恢复事件。
- 将需要持续运行的网络/音频任务放到 `app.ux` 或官方要求的常驻入口，不绑定某个页面生命周期。
- 保存当前 segment、音频位置和缓存索引；应用重启只恢复完整文件。
- 网络反复抖动时使用退避，避免请求风暴。

测试：

- 播放中断网、预取中断、重连、切后台、息屏、应用重启和手机重新连接。
- 在 segment 边界断网，确认能自动播放下一个已缓存 segment。
- 恢复过程中重复触发网络事件，确认不会并发生成。

Acceptance Criteria：

- 断网后仍能播放已缓存内容，至少覆盖目标约 30 分钟的测试缓存。
- 重连后能继续补缓存，已有播放位置不丢失。
- 断网和重连不会产生半成品或重复文件。

### T6：自动化测试、真机验收和第一个测试版本

目标：形成可交付的第一个预缓存测试版本。

工作内容：

- 为文本分段、缓存状态机、缓存键、文件索引和播放状态增加单元测试。
- 为 TTS provider 增加 mock，不让 CI 依赖 vivo AI 凭据或网络。
- 增加模拟器/主机集成测试：在线生成 mock 音频 → 写入缓存 → 模拟断网 → 播放。
- 在 WATCH GT 记录设备型号、BlueOS 版本、音频格式、30 分钟缓存实际大小、连续播放时长和功耗/异常。
- 更新 README、安装/调试步骤和已知限制，生成 debug `.rpk`。

Acceptance Criteria：

- CI 在无网络和无私有凭据环境下通过。
- WATCH GT 能完成：连接手机网络 → 自动缓存 → 断开手机 → 连续播放约 30 分钟 → 暂停/继续/重启续播。
- 失败日志能区分网络不可达、鉴权失败、格式不支持、空间不足和文件损坏。
- PR 附带测试记录和 debug 包构建哈希。

## 4. 备用任务（只有 T0 判定直连不可行时执行）

### T7：手机端预取适配器

- Android 手机负责联网 TTS 或本地 TTS 生成，手表只接收音频 segment。
- 复用已有分片、SHA-256、断点续传和原子落盘协议。
- 手机端实现书籍文本读取、预取队列、传输进度、重试和取消。
- 手表侧继续复用 `CacheSegment`、`CacheState` 和 `WatchAudioPlayer`，不修改播放模型。
- 先选择一个运行时做 PoC；模型和运行时许可证分别审查。
- Acceptance Criteria：手机联网时可补足约 30 分钟缓存，手机断开后手表独立播放。

### T8：手表 Native TTS 预研（不属于 V1）

单独评审 BlueOS Native SDK、原生库加载、模型大小、内存、实时率、功耗和中文音质；不能阻塞 V1 预缓存版本。

## 5. 完成定义

一个任务只有同时满足以下条件才能合并：

- 代码、测试和文档在同一个 PR。
- 不依赖未提交的凭据、私有模型或本地绝对路径。
- 失败路径有可观察日志和清理逻辑。
- Acceptance Criteria 有模拟器或 WATCH GT 的实际记录。
- 没有把未验证的 BlueOS API 当成已支持能力。
