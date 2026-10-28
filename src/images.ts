/**
 * public 目录图片解析。
 *
 * VitePress 里 `/xxx.webp` 指向 public 目录，VitePress 会把它搬到站点根路径；
 * 编辑器预览没有这一层，所以这里直接读文件转成 data URI，路径对不上也不影响显示。
 *
 * @author handy
 */

import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

/** 支持的图片类型 */
const MIME_TYPES: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  bmp: 'image/bmp',
  ico: 'image/x-icon',
  avif: 'image/avif',
};

/** public 目录的常见位置 */
const PUBLIC_DIRS = ['public', path.join('docs', 'public')];

/** 从 md 所在目录向上查找的最大层级 */
const MAX_UP_LEVELS = 8;

/** 单张图片内联上限，超过则保持原地址 */
const MAX_INLINE_BYTES = 5 * 1024 * 1024;

/** 避免同一张图重复读取 */
const dataUriCache = new Map<string, string>();

/**
 * 把 `/` 开头的图片地址解析成可显示的地址。
 *
 * @param src    原始地址
 * @param docDir 当前 markdown 文件所在目录
 * @returns 解析后的地址，无法解析时返回原值
 */
export function resolvePublicImage(src: string, docDir?: string): string {
  const clean = src.split('#')[0].split('?')[0];
  if (!clean.startsWith('/') || clean.startsWith('//')) {
    return src;
  }
  const file = findPublicFile(clean.replace(/^\/+/, ''), docDir);
  return (file && toDataUri(file)) || src;
}

/**
 * 依次在配置目录、md 上层目录、工作区根目录里查找 public 文件。
 *
 * @param relative 相对 public 目录的路径
 * @param docDir   当前 markdown 文件所在目录
 * @returns 文件绝对路径
 */
function findPublicFile(relative: string, docDir?: string): string | undefined {
  const configured = vscode.workspace.getConfiguration('teekMarkdown').get<string>('publicDir', '').trim();
  if (configured) {
    for (const root of workspaceRoots()) {
      const candidate = path.join(root, configured, relative);
      if (isFile(candidate)) {
        return candidate;
      }
    }
  }

  // 与 VitePress 一致：从 md 所在目录向上找 public
  let dir = docDir;
  for (let level = 0; level < MAX_UP_LEVELS && dir && withinWorkspace(dir); level++) {
    for (const name of PUBLIC_DIRS) {
      const candidate = path.join(dir, name, relative);
      if (isFile(candidate)) {
        return candidate;
      }
    }
    const parent = path.dirname(dir);
    dir = parent === dir ? undefined : parent;
  }

  for (const root of workspaceRoots()) {
    for (const name of PUBLIC_DIRS) {
      const candidate = path.join(root, name, relative);
      if (isFile(candidate)) {
        return candidate;
      }
    }
  }
  return undefined;
}

/**
 * 当前工作区根目录。
 *
 * @returns 目录列表
 */
function workspaceRoots(): string[] {
  return (vscode.workspace.workspaceFolders ?? []).map((folder) => folder.uri.fsPath);
}

/**
 * 判断目录是否位于工作区内，避免向上查找越界。
 *
 * @param target 目录绝对路径
 * @returns 是否在工作区内
 */
function withinWorkspace(target: string): boolean {
  return workspaceRoots().some((root) => target === root || target.startsWith(root + path.sep));
}

/**
 * 判断是否为已存在的文件。
 *
 * @param target 绝对路径
 * @returns 是否存在
 */
function isFile(target: string): boolean {
  try {
    return fs.statSync(target).isFile();
  } catch {
    return false;
  }
}

/**
 * 读取图片并转成 data URI。
 *
 * @param file 图片绝对路径
 * @returns data URI，读不了返回 undefined
 */
function toDataUri(file: string): string | undefined {
  const cached = dataUriCache.get(file);
  if (cached) {
    return cached;
  }
  try {
    if (fs.statSync(file).size > MAX_INLINE_BYTES) {
      return undefined;
    }
    const mime = MIME_TYPES[path.extname(file).slice(1).toLowerCase()];
    if (!mime) {
      return undefined;
    }
    const uri = `data:${mime};base64,${fs.readFileSync(file).toString('base64')}`;
    dataUriCache.set(file, uri);
    return uri;
  } catch {
    return undefined;
  }
}
