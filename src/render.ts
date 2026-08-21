// 通用占位符渲染。
// {{KEY}} 默认 HTML 转义，防止 XSS；{{{RAW:KEY}}} 不转义，仅用于受信片段（脚本/样式/预构建 HTML）。

export type RenderVars = Record<string, string | number | undefined>;

const ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, (c) => ESCAPE_MAP[c]);
}

export function render(template: string, vars: RenderVars): string {
  return template.replace(
    /\{\{\{RAW:(\w+)\}\}\}|\{\{(\w+)\}\}/g,
    (_, rawKey: string | undefined, escapedKey: string | undefined) => {
      const key = rawKey || escapedKey!;
      const v = vars[key];
      if (v === undefined || v === null) return '';
      return rawKey ? String(v) : escapeHtml(String(v));
    },
  );
}
