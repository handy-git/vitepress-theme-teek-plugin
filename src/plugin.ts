/**
 * markdown-it 插件：注册 ::: 容器规则、图片规则与 frontmatter 处理。
 *
 * @author handy
 */

import * as path from 'path';
import { containerRule, TeekContainerMeta } from './containers';
import { resolvePublicImage } from './images';
import { renderContainer } from './renderers';

/**
 * 挂到 markdown-it 实例上。
 *
 * @param md markdown-it 实例
 */
export function teekPlugin(md: any): void {
  // 文档开头的 frontmatter 交给 VitePress 处理，预览里直接丢弃
  md.core.ruler.before('block', 'teek_frontmatter', (state: any): void => {
    state.src = state.src.replace(/^---[ \t]*\r?\n[\s\S]*?\r?\n---[ \t]*(\r?\n|$)/, '');
  });

  md.block.ruler.before('fence', 'teek_container', containerRule, {
    alt: ['paragraph', 'reference', 'blockquote', 'list'],
  });

  md.renderer.rules.teek_container = (tokens: any[], idx: number, options: any, env: any): string => {
    const meta = tokens[idx].meta as TeekContainerMeta;
    return renderContainer(meta, (text: string) => md.render(text), documentDir(env));
  };

  // / 开头的图片指向 public 目录，转成 data URI 才能显示。
  // 注意 VS Code 会先把 src 改写成 webview 资源 URI，原始值留在 data-src 里。
  const defaultImage = md.renderer.rules.image;
  md.renderer.rules.image = (tokens: any[], idx: number, options: any, env: any, self: any): string => {
    const token = tokens[idx];
    const original = token.attrGet('data-src') ?? token.attrGet('src');
    if (original) {
      const resolved = resolvePublicImage(original, documentDir(env));
      if (resolved !== original) {
        token.attrSet('src', resolved);
        token.attrSet('data-src', resolved);
      }
    }
    return defaultImage
      ? defaultImage(tokens, idx, options, env, self)
      : self.renderToken(tokens, idx, options);
  };
}

/**
 * 取当前 markdown 文件所在目录，环境里没有时返回 undefined。
 *
 * @param env markdown-it 渲染环境
 * @returns 目录绝对路径
 */
function documentDir(env: any): string | undefined {
  const uri = env?.currentDocument;
  return uri?.fsPath ? path.dirname(uri.fsPath) : undefined;
}
