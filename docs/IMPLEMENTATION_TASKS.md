# BlueOS 听书实施任务清单

基线：GitHub `main` PR4 合并提交 `486089d41a0d93ad51cf41faa6fb793c6341b6d6`。  
TTS 方案任务单：[TTS_PREFETCH_TASKS.md](./TTS_PREFETCH_TASKS.md)  
TTS 设计：[TTS_OFFLINE_DESIGN.md](./TTS_OFFLINE_DESIGN.md)

## 当前 Review 结论

当前 `my-application-1/` 是可展示的 BlueOS UI 原型：

- 首页、播放页、章节目录页已存在
- 播放、音量、倍速、定时和同步目前都是 UI 模拟
- 没有完整的真实音频 API、蓝牙传输、持久化进度或 Android 手机端
- `manifest.json` 的 `appCategory` 仍为 `other`
- 仓库存在 `watch/` 和 `my-application-1/` 两套手表工程，需要统一入口
- 现有 CI 只测试 Python，不测试 BlueOS 工程
- 尚未完成 BlueOS Studio、debug `.rpk` 或 WATCH GT 真机验收

每完成一个任务，单独提交一个 PR；PR review/合并后再进行下一项。

## P0：先完成可运行测试版本

### P0-1 统一工程入口

- [ ] 决定 `my-application-1/` 是否为唯一手表工程
- [ ] 迁移或删除重复的 `watch/` 工程
- [ ] 同步更新设计文档、README 和 CI
- 验收：新开发者只需打开一个目录即可进入 BlueOS Studio

### P0-2 修正 manifest

- [ ] 校验包名、版本号、图标、设备类型和路由
- [ ] 评估将 `appCategory` 改为 `audiobooks`
- [ ] 确认圆形/方形屏幕适配
- [ ] 增加 manifest 静态校验
- 验收：BlueOS Studio 可解析并启动首页

### P0-3 生成第一个 debug rpk

- [ ] 在 BlueOS Studio 安装依赖
- [ ] 启动模拟器
- [ ] 验证首页、播放页、目录页跳转
- [ ] 生成 `dist/*.rpk`
- [ ] 记录 Studio、Node、pnpm 版本和 SHA-256
- 验收：文档可复现构建流程

### P0-4 接入真实音频播放

- [ ] 确认 BlueOS 音频 feature/API
- [ ] 实现播放、暂停、停止、跳转、完成和错误回调
- [ ] 播放实测支持的 MP3 或其他确认支持的格式
- 验收：模拟器或 WATCH GT 可播放本地音频

### P0-5 保存播放进度

- [ ] 定义 PlaybackState
- [ ] 使用 BlueOS 存储 API 持久化书籍、章节、segment 和毫秒位置
- [ ] 启动时恢复
- 验收：退出重启后恢复播放位置

### P0-6 在线预缓存、离线播放

详细执行顺序和接口见 [TTS_PREFETCH_TASKS.md](./TTS_PREFETCH_TASKS.md)。

- [ ] T0：确认 WATCH GT 通过手机蓝牙网络是否能真实访问官方 TTS
- [ ] 核对 `networkManager`、`storage.file`、WebSocket、音频和后台运行 feature
- [ ] 增加 Chapter 正文、TextSegmenter、CacheSegment 和 CacheState
- [ ] 先完成一个短文本：在线 TTS → 临时文件 → 校验 → 本地播放
- [ ] 实现约 30 分钟 rolling buffer，低于约 5 分钟时补充
- [ ] 断网停止新请求但继续播放 ready segment，重连后 probe 成功再恢复
- [ ] 持久化缓存索引和播放位置，禁止半成品进入播放队列
- 验收：连接手机网络后自动缓存，断开手机/关闭网络后仍能连续播放约 30 分钟中文语音

V1 不要求在手表上部署 sherpa-onnx、Piper、eSpeak NG 或其他 Native TTS 模型。

## P1：完善数据和同步

### P1-1 数据驱动书架

- [ ] 用 Book/Chapter 数据替代硬编码
- [ ] 支持选择章节和更新播放页
- [ ] 增加模型测试
- 验收：至少两本书和多个章节可渲染

### P1-2 协议 JSON 编解码

- [ ] 实现 hello、book_manifest、start_chunk、chunk_ack、finish、progress、delete
- [ ] 增加 protocolVersion、requestId、长度和 SHA-256 校验
- [ ] 增加非法消息、重复和乱序测试
- 验收：协议可序列化/反序列化并拒绝非法输入

### P1-3 手表端文件管理

- [ ] 临时文件与最终文件分离
- [ ] 完成校验后才加入书架
- [ ] 处理空间不足、格式错误和删除
- 验收：异常中断不出现可见半文件

### P1-4 蓝牙传输适配器

- [ ] 确认 BLE API 和权限
- [ ] 实现发现、连接、断开、超时和重试
- [ ] 接入分片断点续传
- 验收：完成一个 MP3 或 TTS segment 传输

### P1-5 Android 手机端（备用路径）

此任务只有在 P0-6/T0 证明手表无法通过手机网络直连官方 TTS 时才启动。

- [ ] 创建 `mobile/` 工程
- [ ] 导入书籍正文和音频文件
- [ ] 书架管理、预取队列、传输进度、重试和取消
- [ ] 按独立 provider 接入联网 TTS 或离线 TTS
- [ ] 生成与手表端兼容的 CacheSegment/传输 manifest
- [ ] 复用现有分片、SHA-256、断点续传和原子落盘协议
- 验收：手机联网时可补足约 30 分钟缓存，手机断开后手表独立播放

## P2：验收和发布

### P2-1 端到端异常测试

- [ ] 断线、乱序、重复、校验错误、空间不足
- [ ] 预取取消、网络抖动、进度同步、删除和重新传输
- 验收：不产生不可播放文件，不重复生成 segment

### P2-2 WATCH GT 真机验收

- [ ] 安装 debug rpk
- [ ] 本地音频播放、暂停、切章、快进、音量、倍速
- [ ] 连接手机网络后自动预缓存
- [ ] 断开手机后播放约 30 分钟缓存
- [ ] 息屏播放、蓝牙断开/重连、进度保存、删除、升级
- [ ] 记录设备、BlueOS、SDK、音频格式、缓存大小和结果
- 验收：完成 TTS 预缓存到离线播放的完整链路

### P2-3 手表端 Native TTS 预研

- [ ] 申请并确认 BlueOS Native SDK、编译链和原生库加载方式
- [ ] 用 eSpeak NG 做最小离线中文合成 PoC
- [ ] 评估 sherpa-onnx/Piper 模型在手表 CPU、内存和存储上的可行性
- [ ] 测量实时率、功耗、模型占用和音质
- 验收：明确是否支持“手表无手机、无网络接收新文字后立即朗读”

该任务不属于 V1，不得阻塞在线预缓存版本。

### P2-4 发布包

- [ ] release 签名，私钥不入库
- [ ] 生成手表 rpk 和 Android 包（若 P1-5 已执行）
- [ ] 输出 SHA-256
- [ ] 完善安装、升级和故障排查文档
- 验收：新环境可复现构建和安装

## 执行顺序

当前仍从 **P0-1 统一工程入口** 开始。完成 P0-1 至 P0-5 后，严格按 [TTS_PREFETCH_TASKS.md](./TTS_PREFETCH_TASKS.md) 的 T0 → T6 执行 P0-6；只有 T0 失败时才执行 P1-5。每一步一个 PR，合并后再进入下一步。
