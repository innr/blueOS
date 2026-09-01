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
`blueos.storage.file` 和 `blueos.bluexlink.connectionManager`。音频从
`internal://mass/` 扫描 MP3；没有文件时会明确提示先同步。手机连接实例仍需
填入手机包名与证书指纹，并在真机上确认权限。

`my-application-1/src/platform/audio.js` 和 `progress.js` 继续作为业务层抽象，
便于在不同 SDK 版本间替换实现。
