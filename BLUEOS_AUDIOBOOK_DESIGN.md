# BlueOS 听书软件设计文档 v0.1

## 1. 目标

为 vivo WATCH GT 开发一款低功耗听书应用：手机端负责书籍导入、章节管理和音频同步；手表端负责本地音频播放、播放控制、进度保存和基础信息显示。首版优先验证可安装、可播放、可通过手机传输内容。

## 2. 平台约束与假设

- 目标设备：vivo WATCH GT，BlueOS。
- 不采用 Android APK/Wear OS 技术栈；手表端使用 vivo BlueOS 官方应用开发工具链和安装包格式。
- 由于 BlueOS SDK、设备调试权限和音频 API 需要以实际开发者账号/设备文档为准，代码将把平台适配层隔离，避免业务逻辑绑定未确认 API。
- 手机端首版采用 Android companion app；传输协议和数据模型独立于 UI。

## 3. 首版功能范围

### 手表端

1. 书架：显示已同步书籍和最近播放章节。
2. 播放：播放/暂停、上一章/下一章、前进/后退 15 秒、音量、播放进度。
3. 断点续播：保存书籍、章节、毫秒级位置。
4. 蓝牙同步状态：等待、传输中、完成、失败及可重试。
5. 无音频/空间不足/格式不支持等错误提示。

### 手机端

1. 选择音频文件并读取书名、章节名和时长。
2. 管理书架与章节。
3. 将选定章节传输到手表。
4. 查看手表存储空间和传输进度。
5. 删除手表内容、同步播放进度。

## 4. 架构

```text
手机 Android App
  ├─ Library / Transfer / Playback Sync
  └─ Bluetooth transport
             │
             ▼
手表 BlueOS App
  ├─ UI
  ├─ Playback state machine
  ├─ Local media storage
  └─ BlueOS adapter
```

业务层接口：`DeviceTransport`、`MediaRepository`、`PlaybackController`、`ProgressRepository`。

## 5. 数据模型

```text
Book { id, title, author, cover?, chapters[] }
Chapter { id, bookId, title, durationMs, localUri?, sizeBytes, checksum }
PlaybackState { chapterId, positionMs, status, updatedAt }
TransferTask { id, chapterId, bytesSent, totalBytes, status, errorCode? }
```

## 6. 传输协议 v1

- 控制消息使用版本化 JSON：`hello`、`book_manifest`、`start_chunk`、`chunk_ack`、`finish`、`progress`、`delete`。
- 音频以固定大小分片传输，分片带序号、长度和 SHA-256 校验。
- 断线后从最近确认分片恢复；重复分片必须幂等。
- 所有消息包含 `protocolVersion` 和 `requestId`。

## 7. 音频策略

首版只承诺 SDK 和设备实测支持的格式。默认优先测试 MP3；若 BlueOS 播放器不支持目标格式，由手机端转码为设备支持格式。手表端不承担大规模转码。

## 8. 目录结构

```text
blueOS/
├─ watch/                 # BlueOS 手表应用
│  ├─ app/                 # 页面与状态机
│  ├─ domain/              # 平台无关业务逻辑
│  ├─ platform/            # BlueOS SDK 适配层
│  └─ tests/
├─ mobile/                # Android companion app
│  ├─ app/
│  ├─ domain/
│  └─ tests/
├─ protocol/              # 协议定义、样例和兼容性测试
├─ tools/                  # 构建、打包、校验脚本
├─ docs/
└─ README.md
```

## 9. 异常处理

- 传输失败：保留临时文件，支持重试和断点续传。
- 校验失败：丢弃当前分片并请求重传；最终校验失败不得加入书架。
- 存储不足：传输开始前预检查，过程中不足则安全停止并清理临时文件。
- 播放异常：显示可恢复错误；进度只在成功播放时写入。
- 蓝牙断开：状态机进入 `PAUSED_BY_DISCONNECT`，恢复连接后可继续。

## 10. 测试计划

- 单元测试：协议编解码、分片校验、播放状态机、断点续传。
- 集成测试：虚拟手表传输端模拟断线、乱序、重复、校验错误和空间不足。
- 真机验收：安装、启动、MP3 播放、锁屏/息屏、蓝牙断开恢复、进度保存、删除和升级。
- 构建验收：生成 BlueOS 手表安装包及 Android 手机安装包，并输出 SHA-256。

## 11. Acceptance Criteria

1. 能在 vivo WATCH GT 上安装并启动手表端包。
2. 手机端能发现手表并完成至少一个 MP3 章节传输。
3. 手表端能播放、暂停、切章、拖动/快进，并保存断点。
4. 传输中断后可恢复，不产生不可播放的半文件。
5. 提供可复现的构建命令、安装说明和发布包校验值。

## 12. 分阶段 PR

- PR1：仓库骨架、设计文档、协议模型和模拟传输端。
- PR2：BlueOS SDK 最小应用、安装包构建和真机启动验证。
- PR3：手表端本地书架、播放状态机和音频播放。
- PR4：Android 手机端导入、传输和同步。
- PR5：断点续传、异常处理、完整测试和发布包。

## 13. 当前阻塞项

正式生成可安装手表包前必须取得/确认 vivo BlueOS SDK 版本、开发者工具下载方式、WATCH GT 的开发者调试开关，以及官方支持的音频 API 和安装包后缀。拿到这些信息后，PR2 才能进行真机闭环。
