/**
 * 扩展入口：把 Teek markdown-it 插件挂到内置 Markdown 预览。
 *
 * @author handy
 */

import * as vscode from 'vscode';
import { teekPlugin } from './plugin';

/**
 * 激活扩展。
 *
 * @param context 扩展上下文
 * @returns 供 Markdown 预览使用的扩展点
 */
export function activate(context: vscode.ExtensionContext): { extendMarkdownIt: (md: any) => any } {
  return {
    extendMarkdownIt(md: any): any {
      if (!vscode.workspace.getConfiguration('teekMarkdown').get<boolean>('enabled', true)) {
        return md;
      }
      md.use(teekPlugin);
      return md;
    },
  };
}

/**
 * 释放资源。
 */
export function deactivate(): void {
  // 无需清理
}
