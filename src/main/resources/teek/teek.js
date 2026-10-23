/*
 * Teek Markdown Preview —— 预览页脚本
 *
 * 预览内容由 IDE 通过 IncrementalDOM 反复 patch 到 body，因此转换逻辑挂在
 * afterPatchListeners 上，每次都重新扫一遍顶层块。整块处理完打 data-teek 标记，
 * 保证幂等，避免与 patch 互相踩。
 */
(function () {
  'use strict';

  if (window.__TEEK_PREVIEW__) {
    return;
  }
  window.__TEEK_PREVIEW__ = true;

  var script = document.currentScript;
  var RES_BASE = script && script.src ? script.src.replace(/teek\/teek\.js.*$/, '') : '';

  var OPEN_RE = /^(:{3,})\s*([A-Za-z][A-Za-z0-9_-]*)([^\n]*)$/;
  var CLOSE_RE = /^:{3,}\s*$/;

  /**
   * 参与容器解析的块级元素，正文可能被包在多层容器里，不能只看 body.children
   */
  var BLOCK_SELECTOR = 'p, pre, ul, ol, table, h1, h2, h3, h4, h5, h6, hr';

  var VIDEO_LINKS = {
    bilibili: function (id) { return 'https://www.bilibili.com/video/' + id; },
    tencent: function (id) { return 'https://v.qq.com/x/page/' + id + '.html'; },
    youku: function (id) { return 'https://v.youku.com/v_show/id_' + id + '.html'; },
    youtube: function (id) { return 'https://www.youtube.com/watch?v=' + id; },
    vimeo: function (id) { return 'https://vimeo.com/' + id; },
    xigua: function (id) { return 'https://www.ixigua.com/' + id; }
  };

  // ---------------------------------------------------------------- 基础工具

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) {
      node.className = className;
    }
    if (text !== undefined && text !== null) {
      node.textContent = text;
    }
    return node;
  }

  /**
   * 站内资源统一走 ResourceProvider：<previewBase> + teek/asset/<相对路径>
   */
  function assetUrl(path) {
    if (!path) {
      return '';
    }
    var value = String(path).trim();
    if (/^([a-z][a-z0-9+.-]*:|\/\/)/i.test(value)) {
      return value;
    }
    if (!RES_BASE) {
      return value;
    }
    return RES_BASE + 'teek/asset/' + encodeURI(value.replace(/^\/+/, ''));
  }

  /**
   * 取块内文本，把 <br> 还原成换行，便于按行解析容器标记。
   */
  function blockText(node) {
    var clone = node.cloneNode(true);
    var breaks = clone.querySelectorAll('br');
    for (var i = 0; i < breaks.length; i++) {
      var br = breaks[i];
      if (br.parentNode) {
        br.parentNode.replaceChild(document.createTextNode('\n'), br);
      }
    }
    return clone.textContent;
  }

  function appendContent(box, text, nodes) {
    if (nodes && nodes.length) {
      for (var i = 0; i < nodes.length; i++) {
        box.appendChild(nodes[i].cloneNode(true));
      }
      return;
    }
    var parts = String(text || '').split(/\n{2,}/);
    for (var j = 0; j < parts.length; j++) {
      var part = parts[j].replace(/\n/g, ' ').trim();
      if (part) {
        box.appendChild(el('p', null, part));
      }
    }
  }

  // ---------------------------------------------------------------- YAML 解析
  // 预览页 CSP 禁止 fetch，且不引入第三方库，这里只覆盖 Teek 卡片用到的结构。

  function stripComment(line) {
    var single = false;
    var double = false;
    for (var i = 0; i < line.length; i++) {
      var c = line.charAt(i);
      if (c === "'" && !double) {
        single = !single;
      } else if (c === '"' && !single) {
        double = !double;
      } else if (c === '#' && !single && !double && (i === 0 || /\s/.test(line.charAt(i - 1)))) {
        return line.slice(0, i);
      }
    }
    return line;
  }

  function unquote(value) {
    var v = value.trim();
    if (v.length >= 2) {
      var first = v.charAt(0);
      if ((first === '"' || first === "'") && v.charAt(v.length - 1) === first) {
        return v.slice(1, -1);
      }
    }
    return v;
  }

  function assignEntry(target, line) {
    var index = line.indexOf(':');
    if (index <= 0) {
      return;
    }
    target[line.slice(0, index).trim()] = unquote(line.slice(index + 1));
  }

  function parseYaml(text) {
    var result = { config: {}, data: [] };
    var section = '';
    var item = null;
    var lines = String(text || '').split('\n');

    for (var i = 0; i < lines.length; i++) {
      var line = stripComment(lines[i]);
      if (!line.trim()) {
        continue;
      }
      var indent = line.match(/^\s*/)[0].length;
      var content = line.trim();

      if (indent === 0 && !/^-/.test(content)) {
        var key = content.replace(/:.*$/, '').trim();
        if (key === 'config' || key === 'data') {
          section = key;
          continue;
        }
      }
      if (/^-/.test(content)) {
        item = {};
        result.data.push(item);
        var rest = content.slice(1).trim();
        if (rest) {
          assignEntry(item, rest);
        }
        continue;
      }
      if (section === 'config') {
        assignEntry(result.config, content);
      } else if (item) {
        assignEntry(item, content);
      } else {
        assignEntry(result.config, content);
      }
    }
    return result;
  }

  // ---------------------------------------------------------------- 各类容器

  function renderVideo(arg, text) {
    var platform = String(arg || '').trim().toLowerCase();
    var body = String(text || '').trim();
    var href = '';
    var label = platform;

    if (platform && VIDEO_LINKS[platform]) {
      href = VIDEO_LINKS[platform](body);
    } else {
      href = body;
      var bv = /bvid=([A-Za-z0-9]+)/.exec(body);
      if (bv) {
        label = 'bilibili';
        href = VIDEO_LINKS.bilibili(bv[1]);
        body = bv[1];
      } else if (/v\.qq\.com/.test(body)) {
        label = 'tencent';
      } else if (/youku\.com/.test(body)) {
        label = 'youku';
      } else if (/youtube\.com|youtu\.be/.test(body)) {
        label = 'youtube';
      } else if (/vimeo\.com/.test(body)) {
        label = 'vimeo';
      } else if (/ixigua\.com/.test(body)) {
        label = 'xigua';
      }
      label = label || 'video';
    }

    var card = el('div', 'tk-video');
    var link = el('a', 'tk-video__link');
    link.setAttribute('href', href);
    link.setAttribute('title', '在浏览器中打开：' + href);
    link.appendChild(el('span', 'tk-video__play'));

    var meta = el('div', 'tk-video__meta');
    meta.appendChild(el('span', 'tk-video__platform', label));
    meta.appendChild(el('span', 'tk-video__id', body || href));
    link.appendChild(meta);

    card.appendChild(link);
    card.appendChild(el('p', 'tk-video__hint', 'IDE 预览不支持内嵌播放，点击卡片在浏览器打开'));
    return card;
  }

  var NOTE_TITLES = {
    note: 'NOTE',
    tip: 'TIP',
    warning: 'WARNING',
    danger: 'DANGER',
    info: 'INFO',
    details: 'DETAILS'
  };

  function renderNote(kind, arg, text, nodes) {
    var box = el('div', 'tk-note tk-note--' + kind);
    box.appendChild(el('p', 'tk-note__title', String(arg || '').trim() || NOTE_TITLES[kind] || kind.toUpperCase()));
    appendContent(box, text, nodes);
    return box;
  }

  function renderAlign(className, text, nodes) {
    var box = el('div', className);
    appendContent(box, text, nodes);
    return box;
  }

  function renderCards(kind, arg, text) {
    var yaml = parseYaml(text);
    var data = yaml.data || [];
    var config = yaml.config || {};
    var grid = el('div', 'tk-cards');

    var columns = parseInt(String(arg || config.cardNum || ''), 10);
    if (columns >= 1 && columns <= 4) {
      grid.style.setProperty('--tk-cols', String(columns));
    }
    if (!data.length) {
      grid.appendChild(el('p', 'tk-cards__empty', '未解析到卡片数据，请检查容器内的 YAML'));
      return grid;
    }
    for (var i = 0; i < data.length; i++) {
      grid.appendChild(renderCard(kind, data[i], config));
    }
    return grid;
  }

  function renderCard(kind, item, config) {
    var href = item.link || '';
    var card = el(href ? 'a' : 'div', 'tk-card tk-card--' + kind);
    if (href) {
      card.setAttribute('href', href);
      card.setAttribute('target', config.target === '_self' ? '_self' : '_blank');
    }
    if (kind === 'share') {
      if (item.bgColor) {
        card.style.background = item.bgColor;
      }
      if (item.textColor) {
        card.style.color = item.textColor;
      }
    }

    var cover = kind === 'share' ? item.avatar : item.img;
    if (cover) {
      var wrap = el('div', 'tk-card__cover-wrap');
      var img = document.createElement('img');
      img.className = 'tk-card__cover';
      img.setAttribute('src', imageUrl(cover) || assetUrl(cover));
      img.setAttribute('alt', item.name || '');
      img.onerror = function () {
        wrap.style.display = 'none';
      };
      wrap.appendChild(img);
      card.appendChild(wrap);
    }

    var body = el('div', 'tk-card__body');
    body.appendChild(el('p', 'tk-card__name', item.name || ''));
    if (item.desc) {
      body.appendChild(el('p', 'tk-card__desc', item.desc));
    }
    if (item.author) {
      body.appendChild(el('p', 'tk-card__author', item.author));
    }
    card.appendChild(body);

    if (kind === 'nav' && item.badge) {
      card.appendChild(el('span', 'tk-card__badge tk-card__badge--' + (item.badgeType || 'info'), item.badge));
    }
    return card;
  }

  function renderDemo(arg, text) {
    var box = el('div', 'tk-demo');
    var description = String(arg || '').trim();
    box.appendChild(el('p', 'tk-demo__title', description ? 'Demo 容器 · ' + description : 'Demo 容器'));
    box.appendChild(el('p', 'tk-demo__path', String(text || '').trim() || '(未填写组件路径)'));
    box.appendChild(el('p', 'tk-demo__hint', 'Vue 组件无法在 IDE 预览中运行，启动 VitePress 可查看实际效果'));
    return box;
  }

  function renderUnknown(type, arg, text, nodes) {
    var box = el('div', 'tk-container');
    box.appendChild(el('p', 'tk-container__title', arg ? type + ' ' + arg : type));
    appendContent(box, text, nodes);
    return box;
  }

  function render(type, arg, text, nodes) {
    var widget;
    switch (type) {
      case 'video':
        widget = renderVideo(arg, text);
        break;
      case 'note':
      case 'tip':
      case 'warning':
      case 'danger':
      case 'info':
      case 'details':
        widget = renderNote(type, arg, text, nodes);
        break;
      case 'center':
        widget = renderAlign('tk-center', text, nodes);
        break;
      case 'right':
        widget = renderAlign('tk-right', text, nodes);
        break;
      case 'sharecard':
        widget = renderCards('share', arg, text);
        break;
      case 'imgcard':
        widget = renderCards('img', arg, text);
        break;
      case 'navcard':
        widget = renderCards('nav', arg, text);
        break;
      case 'demo':
        widget = renderDemo(arg, text);
        break;
      default:
        widget = renderUnknown(type, arg, text, nodes);
        break;
    }
    widget.setAttribute('data-teek', '1');
    return widget;
  }

  // ---------------------------------------------------------------- 主流程

  /**
   * 从原始 src 归一化出资源名（相对 public 或 md 目录）。
   *
   * @param src 原始地址
   * @returns {String} 资源名，无法归一化时返回空串
   */
  function assetName(src) {
    if (!src) {
      return '';
    }
    if (src.indexOf('teek/asset/') >= 0) {
      return decodeURIComponent(src.split('teek/asset/')[1]);
    }
    // 绝对形式的静态 URL：/<host>/<endpoint>/<hash>/<name>
    if (/^(?:https?:)?\/\/[^\/]+\/[^\/]+\/[^\/]+\/(.+)$/.test(src)) {
      return decodeURIComponent(src.replace(/^(?:https?:)?\/\/[^\/]+\/[^\/]+\/[^\/]+\//, ''));
    }
    // 相对形式的静态 URL：/<endpoint>/<hash>/<name>
    if (/^\/[a-z]*[A-Z][\w.-]*\/\d+\/(.+)$/.test(src)) {
      return decodeURIComponent(src.replace(/^\/[^\/]+\/[^\/]+\//, ''));
    }
    if (/^\/[^\/]/.test(src)) {
      return decodeURIComponent(src.replace(/^\/+/, ''));
    }
    if (/^\.{1,2}\//.test(src)) {
      return src;
    }
    return '';
  }

  /**
   * 与 Java 侧一致的 key 归一化规则。
   *
   * @param path 引用路径
   * @returns {String} 归一化后的名字
   */
  function normalizeKey(path) {
    return String(path || '').split(/[?#]/)[0].replace(/^(\.\/)+/, '').replace(/^\/+/, '');
  }

  /**
   * 文档内图片映射表，由 Java 侧扫描 md 后下发（只含真实存在的文件）。
   */
  function resourceMap() {
    return (window.__TEEK_PATHS__ || {}).resources || {};
  }

  function fileUrl(absPath) {
    if (!absPath) {
      return '';
    }
    return 'file://' + absPath.split('/').map(function (part) {
      return part ? encodeURIComponent(part) : '';
    }).join('/');
  }

  /**
   * 把图片引用解析成可加载地址：远程原样，本地按映射表直读文件。
   *
   * @param path 引用路径
   * @returns {String} 地址，无法解析时返回空串
   */
  function imageUrl(path) {
    if (!path) {
      return '';
    }
    var value = String(path).trim();
    if (/^([a-z][a-z0-9+.-]*:|\/\/)/i.test(value)) {
      return value;
    }
    var abs = resourceMap()[normalizeKey(value)];
    return abs ? fileUrl(abs) : '';
  }

  /**
   * 按候选地址依次尝试，全部失败后不再重试。
   *
   * @param img        图片元素
   * @param candidates 候选地址
   * @param guard      幂等标记值
   */
  function applyChain(img, candidates, guard) {
    var index = 0;
    var attempt = function () {
      if (index >= candidates.length) {
        img.onerror = null;
        return;
      }
      img.onerror = function () {
        index += 1;
        attempt();
      };
      img.src = candidates[index];
    };
    img.setAttribute('data-teek-applied', guard);
    attempt();
  }

  /**
   * markdown 原生图片：只改写能在映射表里命中的，未命中保持 IDE 原样，绝不臆造路径。
   */
  function fixImages(root) {
    var map = resourceMap();
    var images = root.querySelectorAll('img');
    for (var i = 0; i < images.length; i++) {
      var img = images[i];
      var src = img.getAttribute('src') || '';
      var name = assetName(src);
      var abs = name ? map[normalizeKey(name)] : '';
      if (!abs) {
        continue;
      }
      var primary = RES_BASE ? RES_BASE + 'teek/asset/' + encodeURI(normalizeKey(name)) : fileUrl(abs);
      if (img.getAttribute('data-teek-applied') === primary) {
        continue;
      }
      applyChain(img, [primary, fileUrl(abs)], primary);
    }
  }

  /**
   * 自检：把「容器没识别」与「图片加载失败」两类问题汇总成一条提示，方便反馈定位。
   *
   * @param blocks 扫描到的候选块
   */
  function diagnose(blocks) {
    if (!document.body) {
      return;
    }
    var problems = [];
    var bodyText = String(document.body.textContent || '');

    if (!document.querySelector('[data-teek]') && bodyText.indexOf(':::') >= 0) {
      var sample = '';
      for (var i = 0; i < blocks.length; i++) {
        var content = blocks[i].textContent || '';
        if (content.indexOf(':::') >= 0) {
          sample = blocks[i].tagName.toLowerCase() + '：' + content.replace(/\s+/g, ' ').slice(0, 40);
          break;
        }
      }
      problems.push('未识别容器（候选 ' + blocks.length + ' 块；' + (sample || '找不到含 ::: 的块') + '）');
    }

    var broken = 0;
    var sampleSrc = '';
    var pending = false;
    var images = document.querySelectorAll('img');
    for (var j = 0; j < images.length; j++) {
      var img = images[j];
      if (!img.complete) {
        pending = true;
        continue;
      }
      if (img.naturalWidth === 0) {
        broken++;
        if (!sampleSrc) {
          sampleSrc = img.getAttribute('src') || '';
        }
      }
    }
    if (broken > 0) {
      problems.push('图片失败 ' + broken + ' 张（首个：' + sampleSrc + '）');
    }

    var existing = document.querySelector('.tk-diag');
    if (!problems.length) {
      if (existing && !pending) {
        existing.parentNode.removeChild(existing);
      }
      if (pending) {
        scheduleDiagnose(blocks);
      }
      return;
    }
    var text = 'Teek 诊断：' + problems.join('；');
    if (existing) {
      existing.textContent = text;
      return;
    }
    document.body.insertBefore(el('div', 'tk-diag', text), document.body.firstChild);
  }

  var diagnoseTimer = null;

  /**
   * 图片可能还没加载完，延迟复查一次。
   *
   * @param blocks 候选块
   */
  function scheduleDiagnose(blocks) {
    if (diagnoseTimer) {
      return;
    }
    diagnoseTimer = window.setTimeout(function () {
      diagnoseTimer = null;
      diagnose(blocks);
    }, 1500);
  }

  /**
   * 收集块级候选元素：不依赖 body 直属子节点，正文外面可能还包了一层容器。
   *
   * @returns {Array} 候选块列表
   */
  function collectBlocks() {
    var nodes = document.body.querySelectorAll(BLOCK_SELECTOR);
    var blocks = [];
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      if (node.closest('[data-teek]') || node.closest('.tk-diag')) {
        continue;
      }
      blocks.push(node);
    }
    return blocks;
  }

  function transform() {
    var body = document.body;
    if (!body) {
      return;
    }

    var blocks = collectBlocks();
    for (var i = 0; i < blocks.length; i++) {
      var block = blocks[i];
      if (!block.isConnected) {
        continue;
      }
      var lines = blockText(block).split('\n');
      var open = OPEN_RE.exec(lines[0].trim());
      if (!open) {
        continue;
      }
      var type = open[2].toLowerCase();
      var arg = open[3].trim();

      // 情况一：开闭标记与内容同处一个段落
      var closeAt = -1;
      for (var k = 1; k < lines.length; k++) {
        if (CLOSE_RE.test(lines[k].trim())) {
          closeAt = k;
          break;
        }
      }
      if (closeAt > 0) {
        var tail = lines.slice(closeAt + 1).join('\n').trim();
        var single = render(type, arg, lines.slice(1, closeAt).join('\n'), []);
        block.parentNode.insertBefore(single, block);
        if (tail) {
          block.parentNode.insertBefore(el('p', null, tail), block);
        }
        block.parentNode.removeChild(block);
        continue;
      }

      // 情况二：被渲染成单行（软换行塌陷），形如 "::: video bilibili BVxx :::"
      if (closeAt < 0 && lines.length === 1) {
        var flat = /^(:{3,})\s*([A-Za-z][A-Za-z0-9_-]*)\s+([\s\S]*?)\s*:{3,}$/.exec(lines[0].trim());
        if (flat) {
          var rest = flat[3].trim();
          var space = rest.indexOf(' ');
          var head = space < 0 ? rest : rest.slice(0, space);
          var tailText = space < 0 ? '' : rest.slice(space + 1).trim();
          var flatWidget = type === 'video' && VIDEO_LINKS[head.toLowerCase()]
            ? render(type, head, tailText, [])
            : render(type, head, rest, []);
          block.parentNode.insertBefore(flatWidget, block);
          block.parentNode.removeChild(block);
          continue;
        }
      }

      // 情况三：容器横跨多个块（常见于内部带 yaml 代码块），按兄弟链收集
      var contentNodes = [];
      var endNode = null;
      var cursor = block.nextElementSibling;
      while (cursor) {
        if (cursor.hasAttribute('data-teek')) {
          break;
        }
        if (/^(SCRIPT|STYLE|LINK|META)$/.test(cursor.tagName)) {
          cursor = cursor.nextElementSibling;
          continue;
        }
        var text = blockText(cursor).trim();
        if (CLOSE_RE.test(text)) {
          endNode = cursor;
          break;
        }
        if (OPEN_RE.test(text.split('\n')[0].trim())) {
          break;
        }
        contentNodes.push(cursor);
        cursor = cursor.nextElementSibling;
      }
      if (!endNode) {
        continue;
      }

      var texts = [];
      for (var c = 0; c < contentNodes.length; c++) {
        texts.push(blockText(contentNodes[c]));
      }
      var widget = render(type, arg, texts.join('\n'), contentNodes);
      block.parentNode.insertBefore(widget, block);
      block.parentNode.removeChild(block);
      if (endNode.parentNode) {
        endNode.parentNode.removeChild(endNode);
      }
      for (var d = 0; d < contentNodes.length; d++) {
        if (contentNodes[d].parentNode) {
          contentNodes[d].parentNode.removeChild(contentNodes[d]);
        }
      }
    }

    fixImages(body);
    diagnose(blocks);
  }

  function boot() {
    if (!window.IncrementalDOM || !window.IncrementalDOM.notifications) {
      window.setTimeout(boot, 60);
      return;
    }
    var listeners = window.IncrementalDOM.notifications.afterPatchListeners;
    if (!listeners) {
      listeners = window.IncrementalDOM.notifications.afterPatchListeners = [];
    }
    listeners.push(transform);
    transform();
  }

  boot();
})();
