# BlueOS 听书实施任务清单

基线：GitHub `main` PR4 合并提交 `486089d41a0d93ad51cf41faa6fb793c6341b6d6`。

## 当前 Review 结论

当前 `my-application-1/` 是可展示的 BlueOS UI 原型：

- 首页、播放页、章节目录页已存在
- 播放、音量、倍速、定时和同步目前都是 UI 模拟
- 没有真实音频 API、蓝牙传输、持久化进度或 Android 手机端
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
- [ ] 播放实测支持的 MP3
- 验收：模拟器或 WATCH GT 可播放 MP3

### P0-5 保存播放进度

- [ ] 定义 PlaybackState
- [ ] 使用 BlueOS 存储 API 持久化章节和毫秒位置
- [ ] 启动时恢复
- 验收：退出重启后恢复播放位置

### P0-6 离线文字转语音最小闭环

- [ ] 固定章节文本、TtsArtifact、TtsSegment 和 PlaybackState 数据结构
- [ ] 在 `tools/tts/` 中加入本地模型生成器，手机/电脑无网络也能生成中文音频
- [ ] 评估 sherpa-onnx 中文模型的模型体积、生成速度和音质
- [ ] 先用固定样例验证音频格式和 WATCH GT 本地播放
- [ ] 把生成音频接入现有分片、SHA-256 和原子落盘流程
- [ ] 播放阶段不依赖 `@blueos.ai.speech`、WebSocket 或 appId/appKey
- 验收：手机和手表断网时，手表仍可播放已传输的中文语音，并能暂停、继续和恢复进度

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
- 验收：完成一个 MP3 章节传输

### P1-5 Android 手机端

- [ ] 创建 mobile/ 工程
- [ ] 导入 MP3 和读取章节信息
- [ ] 书架管理、传输进度和重试
- [ ] 集成离线 TTS 引擎和模型管理
- [ ] 支持章节文本转语音并生成 TtsArtifact
- 验收：手机端可离线生成语音并把 MP3 交给传输层

## P2：验收和发布

### P2-1 端到端异常测试

- [ ] 断线、乱序、重复、校验错误、空间不足
- [ ] 进度同步、删除和重新传输
- 验收：不产生不可播放文件

### P2-2 WATCH GT 真机验收

- [ ] 安装 debug rpk
- [ ] MP3 播放、暂停、切章、快进、音量、倍速
- [ ] 离线 TTS 音频播放
- [ ] 息屏播放、蓝牙断开恢复、进度保存、删除、升级
- 验收：记录设备和 BlueOS 版本及结果

### P2-3 手表端 Native TTS 预研

- [ ] 申请并确认 BlueOS Native SDK、编译链和原生库加载方式
- [ ] 用 eSpeak NG 做最小离线中文合成 PoC
- [ ] 评估 sherpa-onnx/Piper 模型在手表 CPU、内存和存储上的可行性
- [ ] 测量实时率、功耗、模型占用和音质
- 验收：明确是否支持“手表无手机、无网络接收新文字后立即朗读”

### P2-4 发布包

- [ ] release 签名，私钥不入库
- [ ] 生成手表 rpk 和 Android 包
- [ ] 输出 SHA-256
- [ ] 完善安装、升级和故障排查文档
- 验收：新环境可复现构建和安装

## 当前执行任务

从 **P0-1 统一工程入口** 开始。先解决 `watch/` 与 `my-application-1/` 的重复问题，再进行真实 API 接入。
