# 构建与设备验收

## BlueOS Studio

1. 安装与目标设备匹配的 BlueOS Studio、Node.js 和 pnpm。
2. 打开 `my-application-1/`（这是仓库唯一的手表工程入口）。
3. 在 Studio 中安装依赖并启动 `watch-square` 和 `watch-round` 预览。
4. 依次验证书架、播放页、章节目录、同步状态卡片和音量控件。
5. 使用 Studio 的 **Package → debug** 生成 `dist/*.rpk`。

工程内可先运行静态检查：

```bash
python tools/validate_blueos_project.py
python -m unittest discover -s tests -v
```

## 发布校验

生成安装包后运行：

```bash
python tools/release_sha256.py dist/*.rpk mobile/app/build/outputs/apk/**/*.apk
```

签名私钥只保存在本机 `my-application-1/sign/`，该目录已加入 `.gitignore`，不得提交。

## API 注入点

应用已声明并调用 Studio 类型包确认的 `blueos.media.audio.audioPlayer`、
`blueos.media.audio.audioManager`、`blueos.storage.storage`、
`blueos.storage.file`、`blueos.network.networkManager`、
`blueos.network.webSocket` 和 `blueos.bluexlink.connectionManager`，并按官方
方案声明 `blueos.ai.speech`。播放页不再扫描 `internal://mass/` 或要求导入 MP3，
而是将在线 TTS chunk 写入 `internal://cache/tts/`，完成后原子移动到
`internal://files/tts/`。TTS 凭据必须通过 Studio 安全配置/构建注入；当前 SDK
没有公开类型声明，`createTts` 参数、chunk 回调和真实音频格式仍需在 WATCH GT
上确认。手机连接实例仍需填入手机包名与证书指纹，并在真机上确认权限。

`my-application-1/src/platform/audio.js` 和 `progress.js` 继续作为业务层抽象，
便于在不同 SDK 版本间替换实现。
