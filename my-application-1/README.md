# 应用示例模版

## 文件结构

```
├── sign                # 存储 rpk 包签名模块(须自行生成);
│   ├── certificate.pem # 证书文件
│   └── private.pem     # 私钥文件
└── src
│   ├── assets          # 公用的资源(images/styles/字体...)
│   │   ├──images       # 存储 png/jpg/svg 等公共图片资源
│   │   └──styles       # 存放 less/css/sass 等公共样式资源
│   ├── pages           # 统一存放项目页面级代码
│   ├── app.ux          # 应用程序代码的人口文件
│   ├── global.js       # 统一定义全局变量、常量；
│   ├── app.d.ts        # 应用声明文件，声明全局变量、类型等；
│   ├── manifest.json   # 配置蓝河应用基本信息
│   └── components      # 存放蓝河应用组件
└── tsconfig.json       # 为 JavaScript 语言服务提供配置选项；
└── package.json        # 定义项目需要的各种模块及配置信息
```

### 模版说明

- `Demo` 页面：示例页面；
- `DemoDetail`页面：详情页面；


## 如何开始

```bash
# 安装依赖（或基于 Studio 图形化操作）
pnpm i
```

## 如何使用

- **内置样式处理方案**；「蓝河应用」支持 `sass` 的预编译；这里采取 [dart sass](https://sass-lang.com/documentation) 方案，并内置了部分变量，以及常用混合方法，使得可以轻松开启样式编写、复用、修改等；
- **添加新增页面命令脚本**；如果需要新建页面，只需运行：`yarn gen YourPageName` ，当然，也可以根据需要，自行定定制模板：_/command/gen/template.ux_；
- **集成 [Prettier](https://prettier.io/)**；在检测代码中潜在问题的同时，统一团队代码规范、风格（`js`，`less`，`scss`等），从而促使写出高质量代码，以提升工作效率(尤其针对团队开发)；

## 内置命令

|  命令 | 描述  | 备注 |
|---|---|---|
| `pnpm gen`  | 新增「 BlueOS 应用」页面 | [Studio 已内置，可通过图形化操作](https://studio.blueos.com.cn/write/create-page/) |

### 在线文字朗读

播放页现在采用“在线 TTS 预取 + 本地缓存播放”路径，不要求用户导入 MP3：

- 章节正文按约 5 分钟切成 segment，在线时串行调用 `@blueos.ai.speech`。
- 音频先写入 `internal://cache/tts/` 临时 URI，接收完成后移动到 `internal://files/tts/` 并更新索引。
- 缓存目标约 30 分钟；断网停止新请求，但继续播放已完成 segment，重连后先 probe 再恢复。
- TTS 凭据只能通过 Studio 安全配置/构建注入，不能提交到 Git。当前凭据为空时会显示“等待 TTS 凭据或网络”。

在 Studio 调试控制台中可临时配置当前运行会话（不要把真实值写入代码或提交）：

```js
global.configureTts('你的 appId', '你的 appKey')
global.getTtsStatus()
```

返回 `{ apiAvailable: true, credentialsConfigured: true }` 后，返回播放页或重新打开章节即可触发 TTS probe。

在目标设备上配置凭据后，可运行 `pnpm test:tts` 验证主机端文本分段、预取状态机和播放器适配器；真实 TTS 音频格式、网络和息屏行为仍需 WATCH GT 真机验收。
