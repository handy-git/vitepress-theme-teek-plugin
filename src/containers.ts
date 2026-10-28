/**
 * Teek 容器语法：::: type [参数]
 *
 * 解析成 markdown-it 的 token，由 renderers 输出 HTML。
 *
 * @author handy
 */

export interface TeekContainerMeta {
  /** 容器类型，如 video、tip、shareCard */
  type: string;
  /** 容器名后面的参数，如视频平台、提示标题、卡片列数 */
  arg: string;
  /** 容器正文，保持原始缩进 */
  content: string;
}

/** 开标记：至少三个冒号 + 容器名 + 参数 */
const OPEN_PATTERN = /^(:{3,})\s*([A-Za-z][\w-]*)(.*)$/;

/** 闭标记：单独一行冒号 */
const CLOSE_PATTERN = /^:{3,}\s*$/;

/**
 * markdown-it 块级规则：识别 ::: 容器。
 *
 * @param state     解析状态
 * @param startLine 起始行
 * @param endLine   结束行
 * @param silent    是否只做识别
 * @returns 是否命中
 */
export function containerRule(state: any, startLine: number, endLine: number, silent: boolean): boolean {
  // 缩进四格以上属于代码块，不处理
  if (state.sCount[startLine] - state.blkIndent >= 4) {
    return false;
  }
  const lineStart = state.bMarks[startLine] + state.tShift[startLine];
  const open = OPEN_PATTERN.exec(state.src.slice(lineStart, state.eMarks[startLine]).trim());
  if (!open) {
    return false;
  }
  if (silent) {
    return true;
  }

  const content: string[] = [];
  let nextLine = startLine + 1;
  let closed = false;
  for (; nextLine < endLine; nextLine++) {
    // 从行首取，保留缩进：卡片容器的 YAML 靠缩进表达层级
    const text = state.src.slice(state.bMarks[nextLine], state.eMarks[nextLine]);
    if (CLOSE_PATTERN.test(text.trim())) {
      closed = true;
      nextLine++;
      break;
    }
    content.push(text);
  }
  // 没有闭合标记就不接管，避免吞掉后续正文
  if (!closed) {
    return false;
  }

  const token = state.push('teek_container', '', 0);
  token.block = true;
  token.map = [startLine, nextLine];
  const meta: TeekContainerMeta = {
    type: open[2],
    arg: open[3].trim(),
    content: content.join('\n'),
  };
  token.meta = meta;
  state.line = nextLine;
  return true;
}
