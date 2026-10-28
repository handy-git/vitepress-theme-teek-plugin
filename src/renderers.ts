/**
 * 各类容器的 HTML 生成。
 *
 * 与 VitePress Theme Teek 的容器语法保持一致，样式类名见 media/teek.css。
 *
 * @author handy
 */

import { load as loadYaml } from 'js-yaml';
import { TeekContainerMeta } from './containers';
import { resolvePublicImage } from './images';

/** 视频平台地址模板 */
const VIDEO_LINKS: Record<string, (id: string) => string> = {
  bilibili: (id) => `https://www.bilibili.com/video/${id}`,
  tencent: (id) => `https://v.qq.com/x/page/${id}.html`,
  youku: (id) => `https://v.youku.com/v_show/id_${id}.html`,
  youtube: (id) => `https://www.youtube.com/watch?v=${id}`,
  vimeo: (id) => `https://vimeo.com/${id}`,
  xigua: (id) => `https://www.ixigua.com/${id}`,
};

/** 提示容器的默认标题 */
const NOTE_TITLES: Record<string, string> = {
  note: 'NOTE',
  tip: 'TIP',
  warning: 'WARNING',
  danger: 'DANGER',
  info: 'INFO',
  details: 'DETAILS',
};

/** 直链视频文件，预览页的 media-src 允许 https，可以直接播放 */
const DIRECT_VIDEO = /\.(mp4|webm|ogg|ogv|mov|m4v)(\?|#|$)/i;

/**
 * 生成容器 HTML。
 *
 * @param meta           容器元信息
 * @param renderMarkdown 把 markdown 渲染成 HTML 的函数
 * @param docDir         当前 markdown 文件所在目录
 * @returns HTML 片段
 */
export function renderContainer(
  meta: TeekContainerMeta,
  renderMarkdown: (text: string) => string,
  docDir?: string,
): string {
  const inline = (text: string): string => renderMarkdown(text);
  const kind = meta.type.toLowerCase();
  switch (kind) {
    case 'video':
      return renderVideo(meta.arg, meta.content);
    case 'note':
    case 'tip':
    case 'warning':
    case 'danger':
    case 'info':
    case 'details':
      return renderNote(kind, meta.arg, inline(meta.content));
    case 'center':
      return `<div class="tk-center">${inline(meta.content)}</div>`;
    case 'right':
      return `<div class="tk-right">${inline(meta.content)}</div>`;
    case 'sharecard':
      return renderCards('share', meta.arg, meta.content, docDir);
    case 'imgcard':
      return renderCards('img', meta.arg, meta.content, docDir);
    case 'navcard':
      return renderCards('nav', meta.arg, meta.content, docDir);
    case 'demo':
      return renderDemo(meta.arg, meta.content);
    default:
      return renderUnknown(meta.type, meta.arg, inline(meta.content));
  }
}

/**
 * 视频容器：直链视频直接播放，平台视频渲染成卡片外链。
 *
 * @param arg     平台名或空
 * @param content 视频 ID 或完整链接
 * @returns HTML 片段
 */
function renderVideo(arg: string, content: string): string {
  const platform = arg.trim().toLowerCase();
  let id = content.trim();
  let href = id;
  let label = platform;

  if (!VIDEO_LINKS[platform] && DIRECT_VIDEO.test(id)) {
    return [
      '<div class="tk-video">',
      `<video class="tk-video__player" controls preload="metadata" src="${escapeHtml(id)}"></video>`,
      '<p class="tk-video__hint">直链视频，可直接在预览中播放</p>',
      '</div>',
    ].join('');
  }

  if (platform && VIDEO_LINKS[platform]) {
    href = VIDEO_LINKS[platform](id);
  } else {
    const bvid = /bvid=([A-Za-z0-9]+)/.exec(id);
    if (bvid) {
      label = 'bilibili';
      id = bvid[1];
      href = VIDEO_LINKS.bilibili(id);
    } else if (/v\.qq\.com/.test(id)) {
      label = 'tencent';
    } else if (/youku\.com/.test(id)) {
      label = 'youku';
    } else if (/youtube\.com|youtu\.be/.test(id)) {
      label = 'youtube';
    } else if (/vimeo\.com/.test(id)) {
      label = 'vimeo';
    } else if (/ixigua\.com/.test(id)) {
      label = 'xigua';
    }
    label = label || 'video';
  }

  return [
    '<div class="tk-video">',
    `<a class="tk-video__link" href="${escapeHtml(href)}" target="_blank" rel="noopener" title="在浏览器中打开：${escapeHtml(href)}">`,
    '<span class="tk-video__play"></span>',
    '<span class="tk-video__meta">',
    `<span class="tk-video__platform">${escapeHtml(label)}</span>`,
    `<span class="tk-video__id">${escapeHtml(id || href)}</span>`,
    '</span>',
    '</a>',
    '<p class="tk-video__hint">预览不支持内嵌播放，点击卡片在浏览器打开</p>',
    '</div>',
  ].join('');
}

/**
 * 提示容器。
 *
 * @param kind  容器类型
 * @param arg   标题
 * @param html  已渲染的正文
 * @returns HTML 片段
 */
function renderNote(kind: string, arg: string, html: string): string {
  const title = arg || NOTE_TITLES[kind] || kind.toUpperCase();
  return [
    `<div class="tk-note tk-note--${escapeHtml(kind)}">`,
    `<p class="tk-note__title">${escapeHtml(title)}</p>`,
    html,
    '</div>',
  ].join('');
}

/**
 * 卡片容器，解析容器内的 YAML。
 *
 * @param kind    share / img / nav
 * @param arg     列数
 * @param content 容器正文（可能包着 yaml 代码块）
 * @param docDir  当前 markdown 文件所在目录
 * @returns HTML 片段
 */
function renderCards(kind: string, arg: string, content: string, docDir?: string): string {
  const parsed = parseCards(content);
  const columns = Number.parseInt(arg || String(parsed.config.cardNum ?? ''), 10);
  const style = columns >= 1 && columns <= 4 ? ` style="--tk-cols:${columns}"` : '';
  if (!parsed.items.length) {
    return `<div class="tk-cards"${style}><p class="tk-cards__empty">未解析到卡片数据，请检查容器内的 YAML</p></div>`;
  }
  const cards = parsed.items.map((item) => renderCard(kind, item, parsed.config, docDir)).join('');
  return `<div class="tk-cards"${style}>${cards}</div>`;
}

/**
 * 解析卡片 YAML，兼容顶层数组与 config/data 两种写法。
 *
 * @param content 容器正文
 * @returns 卡片列表与配置
 */
function parseCards(content: string): { items: any[]; config: any } {
  const text = stripFence(content);
  try {
    const parsed: any = loadYaml(text);
    if (Array.isArray(parsed)) {
      return { items: parsed, config: {} };
    }
    if (parsed && typeof parsed === 'object') {
      return { items: Array.isArray(parsed.data) ? parsed.data : [], config: parsed.config ?? {} };
    }
  } catch {
    // YAML 不合法时按空数据处理，页面给出提示
  }
  return { items: [], config: {} };
}

/**
 * 去掉容器正文外面的 ```yaml 围栏。
 *
 * @param content 容器正文
 * @returns 纯 YAML 文本
 */
function stripFence(content: string): string {
  const text = content.trim();
  const fenced = /^```[\w-]*\n([\s\S]*?)\n?```$/.exec(text);
  return fenced ? fenced[1] : text;
}

/**
 * 单张卡片。
 *
 * @param kind   卡片类型
 * @param item   卡片数据
 * @param config 共用配置
 * @param docDir 当前 markdown 文件所在目录
 * @returns HTML 片段
 */
function renderCard(kind: string, item: any, config: any, docDir?: string): string {
  const href = item.link ? String(item.link) : '';
  const tag = href ? 'a' : 'div';
  const attrs = [`class="tk-card tk-card--${escapeHtml(kind)}"`];
  if (href) {
    const target = config.target === '_self' ? '_self' : '_blank';
    attrs.push(`href="${escapeHtml(href)}"`, `target="${target}"`, 'rel="noopener"');
  }
  if (kind === 'share') {
    if (item.bgColor) {
      attrs.push(`style="background:${escapeHtml(String(item.bgColor))};color:${escapeHtml(String(item.textColor ?? 'inherit'))}"`);
    }
  }

  const cover = kind === 'share' ? item.avatar : item.img;
  const coverHtml = cover
    ? `<div class="tk-card__cover-wrap"><img class="tk-card__cover" src="${escapeHtml(resolvePublicImage(String(cover), docDir))}" alt="${escapeHtml(String(item.name ?? ''))}"></div>`
    : '';

  const body = [
    '<div class="tk-card__body">',
    `<p class="tk-card__name">${escapeHtml(String(item.name ?? ''))}</p>`,
    item.desc ? `<p class="tk-card__desc">${escapeHtml(String(item.desc))}</p>` : '',
    item.author ? `<p class="tk-card__author">${escapeHtml(String(item.author))}</p>` : '',
    '</div>',
  ].join('');

  const badge = kind === 'nav' && item.badge
    ? `<span class="tk-card__badge tk-card__badge--${escapeHtml(String(item.badgeType ?? 'info'))}">${escapeHtml(String(item.badge))}</span>`
    : '';

  return `<${tag} ${attrs.join(' ')}>${coverHtml}${body}${badge}</${tag}>`;
}

/**
 * 组件演示占位。
 *
 * @param arg     描述
 * @param content 组件路径
 * @returns HTML 片段
 */
function renderDemo(arg: string, content: string): string {
  const title = arg ? `Demo 容器 · ${arg}` : 'Demo 容器';
  return [
    '<div class="tk-demo">',
    `<p class="tk-demo__title">${escapeHtml(title)}</p>`,
    `<p class="tk-demo__path">${escapeHtml(content.trim() || '(未填写组件路径)')}</p>`,
    '<p class="tk-demo__hint">Vue 组件无法在预览中运行，启动 VitePress 可查看实际效果</p>',
    '</div>',
  ].join('');
}

/**
 * 未注册容器的降级展示。
 *
 * @param type 容器类型
 * @param arg  参数
 * @param html 已渲染的正文
 * @returns HTML 片段
 */
function renderUnknown(type: string, arg: string, html: string): string {
  const title = arg ? `${type} ${arg}` : type;
  return [
    '<div class="tk-container">',
    `<p class="tk-container__title">${escapeHtml(title)}</p>`,
    html,
    '</div>',
  ].join('');
}

/**
 * HTML 转义。
 *
 * @param value 原始文本
 * @returns 转义结果
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
