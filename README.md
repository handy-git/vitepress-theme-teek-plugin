# Teek Markdown Preview

让 IntelliJ IDEA / WebStorm 的 Markdown 预览正确渲染 [VitePress Theme Teek](https://vp.teek.top) 的自定义语法。

## 支持的语法

| 语法 | 说明 |
| --- | --- |
| `::: video bilibili\|tencent\|youku\|youtube\|vimeo\|xigua` | 视频容器，渲染为卡片，点击在浏览器打开 |
| `::: note` / `::: tip` / `::: warning` / `::: danger` / `::: info` / `::: details` | 提示类容器，按类型分色 |
| `::: center` / `::: right` | 居中 / 居右容器 |
| `::: shareCard` / `::: imgCard` / `::: navCard` | 卡片容器，自动解析容器内的 YAML |
| `::: demo` | 组件演示占位（Vue 组件无法在预览中运行） |
| `- [ ]` / `- [x]` | TODO 列表 |
| `![](/plugin/a.webp)` | 以 `/` 开头的图片自动映射到 VitePress 的 public 目录 |

## 环境要求

- IntelliJ IDEA 2026.2+ / WebStorm 2026.2+（build 262）
- Markdown 插件（IDEA 内置）

> 插件启动时会自动把 Markdown 预览渲染器切换为 JCEF —— Compose 预览不加载扩展注入的脚本，
> 若不切换，Teek 容器会原样输出。

## 安装

下载 `vitepress-theme-teek-plugin-0.1.0.zip`，在 IDEA 中执行
`Settings → Plugins → 齿轮 → Install Plugin from Disk...`，重启 IDE。

设置项位于 `Settings → Languages & Frameworks → Teek Markdown`：

- 启用 Teek 容器与图片路径解析
- public 目录（相对项目路径，留空时从 md 文件向上自动查找 `public` 与 `docs/public`）

## 本地构建

```sh
# 需要 JDK 25（2026.2 平台类文件版本为 69）
./gradlew buildPlugin
```

产物位于 `build/distributions/`。构建脚本默认复用本机已安装的 IDE：

```kotlin
intellijPlatform {
    local("/Applications/IntelliJ IDEA.app")
}
```

## 目录结构

```
src/main/java/cn/handyplus/teek/markdown/
├── preview/    预览扩展与资源加载（MarkdownBrowserPreviewExtension + ResourceProvider）
├── settings/   设置项与设置页
└── TeekStartupActivity.java   启动时校正预览渲染器
src/main/resources/teek/
├── teek.js     容器改写、YAML 解析、图片地址归一化
└── teek.css    预览样式
samples/        全语法自测样例
```

## 已知限制

- 视频容器受 IDE 预览页 CSP 限制（`child-src 'none'`），无法内嵌播放，仅提供卡片与外链
- `demo` 容器无法运行 Vue 组件，只展示占位信息

## License

[MIT](./LICENSE) © 2026 handy
