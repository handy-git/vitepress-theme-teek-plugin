# Teek Markdown Preview

在 Markdown 预览中渲染 [VitePress Theme Teek](https://github.com/Kele-Bingtang/vitepress-theme-teek) 的自定义容器语法。

[![JetBrains Marketplace](https://img.shields.io/jetbrains/plugin/v/35492.svg?label=Marketplace)](https://plugins.jetbrains.com/plugin/35492-teek-markdown-preview)
[![Downloads](https://img.shields.io/jetbrains/plugin/d/35492.svg)](https://plugins.jetbrains.com/plugin/35492-teek-markdown-preview)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

## 功能

| 语法                                                                     | 效果                                   |
|--------------------------------------------------------------------------|----------------------------------------|
| `::: video bilibili\|tencent\|youku\|youtube\|vimeo\|xigua`              | 视频容器，渲染为卡片，点击在浏览器打开 |
| `::: note` `::: tip` `::: warning` `::: danger` `::: info` `::: details` | 提示容器，按类型分色                   |
| `::: center` `::: right`                                                 | 居中 / 居右容器                        |
| `::: shareCard` `::: imgCard` `::: navCard`                              | 卡片容器，自动解析容器内的 YAML        |
| `::: demo`                                                               | 组件演示占位                           |
| `- [ ]` `- [x]`                                                          | TODO 列表                              |
| `![](/plugin/a.webp)`                                                    | 以 `/` 开头的图片映射到 public 目录    |
| `![](./a.png)`                                                           | 相对路径图片按 md 所在目录解析         |

## 安装

- 通过 IDE 内置插件系统：

  <kbd>Settings/Preferences</kbd> > <kbd>Plugins</kbd> > <kbd>Marketplace</kbd> > <kbd>Search for "Teek Markdown
  Preview"</kbd> > <kbd>Install Plugin</kbd>

- 或直接打开 [JetBrains Marketplace 插件页](https://plugins.jetbrains.com/plugin/35492-teek-markdown-preview) 点击 <kbd>
  Install</kbd>

安装后重启 IDE 生效，需要 IntelliJ IDEA 2026.2+ / WebStorm 2026.2+。

## 说明

- 视频以卡片展示，点击在浏览器打开，受编辑器预览限制无法内嵌播放
- `demo` 容器无法运行 Vue 组件，只显示占位
- 首次打开预览会自动切换为 JCEF 渲染，Compose 预览不加载插件脚本
- 设置项：`Settings → Languages & Frameworks → Teek Markdown`，可配置 public 目录

## License

[MIT](./LICENSE) © 2026 handy
