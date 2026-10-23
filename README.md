# Teek Markdown Preview

Renders [VitePress Theme Teek](https://github.com/Kele-Bingtang/vitepress-theme-teek) custom markdown containers in the Markdown preview.

---

# Teek Markdown Preview

在 Markdown 预览中渲染 [VitePress Theme Teek](https://github.com/Kele-Bingtang/vitepress-theme-teek) 的自定义容器语法。

## 支持的语法

| 语法 | 说明 |
| --- | --- |
| `::: video bilibili\|tencent\|youku\|youtube\|vimeo\|xigua` | 视频容器，渲染为卡片，点击在浏览器打开 |
| `::: video` + 链接 | 自定义视频链接，同样渲染为卡片 |
| `::: note` / `::: tip` / `::: warning` / `::: danger` / `::: info` / `::: details` | 提示类容器，按类型分色，标题取容器名后的文字 |
| `::: center` / `::: right` | 居中 / 居右容器 |
| `::: shareCard` / `::: imgCard` / `::: navCard` | 卡片容器，自动解析容器内的 YAML，支持 `config` 段与列数参数 |
| `::: demo` | 组件演示占位（Vue 组件无法在预览中运行） |
| `- [ ]` / `- [x]` | TODO 列表 |
| `![](/plugin/a.webp)` | 以 `/` 开头的图片自动映射到 VitePress 的 public 目录 |
| `![](./a.png)` | 相对路径图片按 md 文件所在目录解析 |

## 环境要求

- IntelliJ IDEA 2026.2+ / WebStorm 2026.2+（build 262）
- Markdown 插件（IDE 内置）

> 插件启动时会自动把 Markdown 预览渲染器切换为 JCEF —— Compose 预览不加载扩展注入的脚本，
> 若不切换，Teek 容器会原样输出。

## 安装

从仓库的 Releases 页面下载最新的 `vitepress-theme-teek-plugin-<版本号>.zip`，
在 IDE 中执行 `Settings → Plugins → 齿轮 → Install Plugin from Disk...`，重启 IDE。

设置项位于 `Settings → Languages & Frameworks → Teek Markdown`：

- 启用 Teek 容器与图片路径解析
- public 目录（相对项目路径，留空时从 md 文件向上自动查找 `public` 与 `docs/public`）

## 构建

```sh
# 需要 JDK 25（2026.2 平台类文件版本为 69）
./gradlew buildPlugin
```

产物位于 `build/distributions/`。默认按版本号下载对应 IDE；如需离线构建，
设置 `LOCAL_IDE_PATH` 指向本机已安装的 IDE：

```sh
LOCAL_IDE_PATH="/Applications/IntelliJ IDEA.app" ./gradlew buildPlugin
```

## 版本与发布

版本号统一由 Git tag 决定，推送 tag 即自动构建并发布到 Releases：

```sh
git tag v0.2.0
git push origin v0.2.0
```

工作流（`.github/workflows/release.yml`）会用该 tag 作为插件版本号构建，
产物 `vitepress-theme-teek-plugin-<版本号>.zip` 上传到 Releases 页面。

本地构建时版本号取 `gradle.properties` 的 `pluginVersion`，需要临时改版本可覆盖：

```sh
./gradlew buildPlugin -PpluginVersion=0.2.0
```

## 发布到 Marketplace

```sh
# 1. 签名（证书链、私钥、密码通过环境变量提供）
export CERTIFICATE_CHAIN=/path/to/chain.pem
export PRIVATE_KEY=/path/to/private.key
export PRIVATE_KEY_PASSWORD=***
./gradlew signPlugin

# 2. 打包
./gradlew buildPlugin
```

签名后的 ZIP 同样输出到 `build/distributions/`。

上架合规要点：

| 项目 | 要求 | 本项目 |
| --- | --- | --- |
| Logo | SVG，40x40 px，不与官方图标相似 | `src/main/resources/META-INF/pluginIcon.svg` |
| 名称 | 不含 Plugin / IntelliJ / JetBrains 等产品名，长度 ≤ 30 | `Teek Markdown Preview`（20 字符） |
| 描述 | 主要语言为英文 | 已改为英文 |
| 链接 | 有效且与插件相关 | 主题仓库、主题文档站 |
| 签名 | 上传前签名 | `signPlugin` 任务 |

## 目录结构

```
src/main/java/cn/handyplus/teek/markdown/
├── TeekStartupActivity.java       启动时把预览渲染器切换为 JCEF
├── preview/
│   ├── TeekPreviewExtensionProvider.java  预览扩展注册入口
│   └── TeekPreviewExtension.java           注入脚本样式 + 接管图片资源加载
├── settings/
│   ├── TeekSettings.java          插件配置持久化
│   └── TeekConfigurable.java      设置页
src/main/resources/
├── META-INF/plugin.xml            插件描述与扩展点声明
├── META-INF/pluginIcon.svg        40x40 图标
└── teek/
    ├── teek.js                    容器改写、YAML 解析、图片地址归一化
    └── teek.css                   预览样式
samples/teek-preview.md            全语法自测样例
```

## 已知限制

- 视频容器受 IDE 预览页 CSP 限制（`child-src 'none'`），无法内嵌播放，仅提供卡片与外链
- `demo` 容器无法运行 Vue 组件，只展示占位信息

## License

[MIT](./LICENSE) © 2026 handy
