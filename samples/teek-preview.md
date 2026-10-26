---
title: Teek 预览自测
---

# Teek 预览自测

下面每个容器在 IDEA 预览里都应该渲染成对应样式，而不是裸露的 `:::` 文本。

## video

::: video bilibili
BV1oLnt6tEDH
:::

::: video
https://player.bilibili.com/player.html?bvid=BV1oLnt6tEDH&autoplay=0
:::

## note / center / right

::: note 自定义标题
这是一个 note 容器，标题来自容器名后面的文字。
:::

::: center
居中内容
:::

::: right
@Teek
:::

## shareCard

::: shareCard 2

```yaml
- name: George Chan
  desc: 让我给你讲讲他的传奇故事吧
  avatar: https://z3.ax1x.com/2021/09/30/4oKMVI.jpg
  link: https://cyc0819.top/
  bgColor: "#FFB6C1"
  textColor: "#621529"
- name: butcher2000
  desc: 即使再小的帆，也能远航
  link: https://blog.csdn.net/weixin_46827107
  bgColor: "#CBEAFA"
  textColor: "#6854A1"
```

:::

## imgCard

::: imgCard

```yaml
- img: https://vp.teek.top/blog/bg1.webp
  link: https://vp.teek.top
  name: 标题
  desc: 描述内容
  author: Teek
- img: https://vp.teek.top/blog/bg2.webp
  link: https://vp.teek.top
  name: 标题
  desc: 描述内容
```

:::

## navCard

::: navCard

```yaml
- name: 百度
  desc: 全球最大的中文搜索引擎
  link: http://www.baidu.com/
  img: https://www.baidu.com/favicon.ico
  badge: 搜索引擎
  badgeType: tip
```

:::

## demo

::: demo effect 一个简单的按钮
demo/button-primary
:::

## 未知容器

::: myCustom 参数
未注册的容器会降级成通用提示框。
:::

## 图片路径

远程图片（CSP 允许）：

![remote](https://vp.teek.top/blog/bg3.webp)

public 目录图片（插件从 md 所在目录向上查找 public，本文件对应 `samples/public/blog/bg1.png`）：

![public](/blog/bg1.png)

相对路径图片（相对本 md 所在目录）：

![relative](./public/blog/bg1.png)
