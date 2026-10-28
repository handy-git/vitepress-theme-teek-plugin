# Teek Markdown Preview

Renders [VitePress Theme Teek](https://github.com/Kele-Bingtang/vitepress-theme-teek) custom markdown containers in the
Markdown preview.

| Syntax                                                                   | Effect                                                             |
|--------------------------------------------------------------------------|--------------------------------------------------------------------|
| `::: video bilibili\|tencent\|youku\|youtube\|vimeo\|xigua`              | Video container, rendered as a card that opens in the browser      |
| `::: note` `::: tip` `::: warning` `::: danger` `::: info` `::: details` | Callout containers, colored by type                                |
| `::: center` `::: right`                                                 | Alignment containers                                               |
| `::: shareCard` `::: imgCard` `::: navCard`                              | Card containers, the YAML inside is parsed                         |
| `::: demo`                                                               | Component demo placeholder                                         |
| `- [ ]` `- [x]`                                                          | TODO list                                                          |
| `/plugin/a.webp`                                                         | Images starting with `/` are resolved against the public directory |
| `./a.png`                                                                | Relative images are resolved against the Markdown file directory   |

## Installation

Search `Teek Markdown Preview` in the Extensions view, or install the `.vsix` manually:
<kbd>Extensions</kbd> > <kbd>⋯</kbd> > <kbd>Install from VSIX...</kbd>

Requires VS Code 1.85 or later.

---

# Teek Markdown Preview

在 VS Code 的 Markdown 预览中渲染 [VitePress Theme Teek](https://github.com/Kele-Bingtang/vitepress-theme-teek)
的自定义容器语法。

## 功能

| 语法                                                                     | 效果                                   |
|--------------------------------------------------------------------------|----------------------------------------|
| `::: video bilibili\|tencent\|youku\|youtube\|vimeo\|xigua`              | 视频容器，渲染为卡片，点击在浏览器打开 |
| `::: note` `::: tip` `::: warning` `::: danger` `::: info` `::: details` | 提示容器，按类型分色                   |
| `::: center` `::: right`                                                 | 居中 / 居右容器                        |
| `::: shareCard` `::: imgCard` `::: navCard`                              | 卡片容器，自动解析容器内的 YAML        |
| `::: demo`                                                               | 组件演示占位                           |
| `- [ ]` `- [x]`                                                          | TODO 列表                              |
| `/plugin/a.webp`                                                         | 以 `/` 开头的图片按 public 目录解析    |
| `./a.png`                                                                | 相对路径图片按 md 所在目录解析         |

## 安装

- 扩展市场搜索 `Teek Markdown Preview` 安装

- 或下载 `.vsix` 手动安装：

  <kbd>Extensions</kbd> > <kbd>⋯</kbd> > <kbd>Install from VSIX...</kbd>

需要 VS Code 1.85 及以上。

## 说明

- 预览页禁止内嵌 iframe，视频以卡片展示，点击在浏览器打开
- `demo` 容器无法运行 Vue 组件，只显示占位
- `/` 开头的图片会读取文件内联显示，不依赖预览页的资源路径
- 设置项：`teekMarkdown.enabled`、`teekMarkdown.publicDir`（留空时自动查找 `public` 与 `docs/public`）

## License

[MIT](./LICENSE) © 2026 handy
