# BlueOS 听书实施任务清单

基线：GitHub `main` 最新提交 `f942a5f2f1fce3880e59cf36c9bd02c85af9553d`。

## 当前 Review 结论

当前 `my-application-1/` 是唯一的、可展示的 BlueOS UI 原型：

- 首页、播放页、章节目录页已存在
- 播放、音量、倍速、定时和同步目前都是 UI 模拟
- 没有真实音频 API、蓝牙传输、持久化进度或 Android 手机端
- `manifest.json` 的 `appCategory` 仍为 `other`
- 已确认仓库中不存在独立的 `watch/` 工程；`my-application-1/` 是唯一入口
- 现有 CI 只测试 Python，不测试 BlueOS 工程
- 尚未完成 BlueOS Studio、debug `.rpk` 或 WATCH GT 真机验收

每完成一个任务，单独提交一个 PR；PR review/合并后再进行下一项。

## P0：先完成可运行测试版本

### P0-1 统一工程入口

- [x] 决定 `my-application-1/` 为唯一手表工程
- [x] 确认仓库中不存在重复的 `watch/` 工程，无需迁移或删除
- [x] 同步更新设计文档和 README；CI 更新在 P0-2 的工程静态校验中完成
- 验收：新开发者只需打开 `my-application-1/` 即可进入 BlueOS Studio

### P0-2 修正 manifest

- [x] 校验包名、版本号、图标、设备类型和路由
- [x] 保持 `appCategory: other`；待 BlueOS Studio 确认官方分类枚举后再评估 `audiobooks`
- [ ] 确认圆形/方形屏幕适配（Studio 预览与真机验收）
- [x] 增加 manifest 静态校验，并纳入 CI
- 验收：静态校验通过；BlueOS Studio 解析与启动首页仍待 SDK 环境验证

### P0-3 生成第一个 debug rpk

- [ ] 在 BlueOS Studio 安装依赖
- [ ] 启动模拟器
- [ ] 验证首页、播放页、目录页跳转
- [ ] 生成 `dist/*.rpk`
- [ ] 记录 Studio、Node、pnpm 版本和 SHA-256
- 验收：文档可复现构建流程

### P0-4 接入真实音频播放

- [ ] 确认 BlueOS 音频 feature/API（需官方 SDK/设备；业务边界已在 `src/platform/audio.js` 固化）
- [x] 在 `protocol/playback.py` 固化播放、暂停、停止、跳转、完成和错误状态边界
- [ ] 绑定并实测支持的 MP3（需官方 SDK/设备）
- 验收：模拟器或 WATCH GT 可播放 MP3

### P0-5 保存播放进度

- [x] 定义 `PlaybackState` 和状态机
- [ ] 使用 BlueOS 存储 API 持久化章节和毫秒位置（业务边界已在 `src/platform/progress.js` 固化）
- [ ] 启动时恢复
- 验收：退出重启后恢复播放位置

## P1：完善数据和同步

### P1-1 数据驱动书架

- [x] 用 `Book`/`Chapter` 数据源驱动书籍状态
- [x] 支持选择章节和更新播放页
- [x] 增加模型与状态测试
- 验收：至少两本书和多个章节可渲染

### P1-2 协议 JSON 编解码

- [x] 实现 hello、book_manifest、start_chunk、chunk_ack、finish、progress、delete
- [x] 增加 protocolVersion、requestId、长度和 SHA-256 校验
- [x] 增加非法消息、重复和乱序测试
- 验收：协议可序列化/反序列化并拒绝非法输入

### P1-3 手表端文件管理

- [x] 临时文件与最终文件分离
- [x] 完成校验后才加入书架
- [x] 处理空间不足、格式错误和删除
- 验收：异常中断不出现可见半文件

### P1-4 蓝牙传输适配器

- [ ] 确认 BLE API 和权限（需官方 SDK/手机与手表）
- [x] 实现发现、连接、断开、超时和重试适配器边界
- [x] 接入分片断点续传接口
- 验收：完成一个 MP3 章节传输

### P1-5 Android 手机端

- [x] 创建 `mobile/` 工程
- [x] 导入 MP3 和读取章节信息
- [x] 书架模型、传输进度和重试队列
- 验收：手机端可把 MP3 交给传输层

## P2：验收和发布

### P2-1 端到端异常测试

- [x] 断线、乱序、重复、校验错误、空间不足
- [x] 进度同步、删除和重新传输
- 验收：不产生不可播放文件

### P2-2 WATCH GT 真机验收

- [ ] 安装 debug rpk
- [ ] MP3 播放、暂停、切章、快进、音量、倍速
- [ ] 息屏播放、蓝牙断开恢复、进度保存、删除、升级
- 验收：记录设备和 BlueOS 版本及结果

### P2-3 发布包

- [ ] release 签名，私钥不入库
- [ ] 生成手表 rpk 和 Android 包
- [x] 提供 `tools/release_sha256.py` 输出 SHA-256
- [ ] 完善安装、升级和故障排查文档
- 验收：新环境可复现构建和安装

## 当前执行任务

可编码任务已完成；下一步是用户在 BlueOS Studio/WATCH GT 上执行 P0-3、P0-4、P0-5
和 P2 真机验收，并将官方音频、存储、BLE API 注入对应平台边界。
