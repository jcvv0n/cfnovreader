// 通用 {{KEY}} 占位符渲染。
// 未提供的占位符替换为空串而不是留下 {{XXX}}，避免漏字段时露馅到前端。

export type RenderVars = Record<string, string | number | undefined>;

export function render(template: string, vars: RenderVars): string {
  return template.replace(/{{(\w+)}}/g, (_, key: string) => {
    const v = vars[key];
    return v === undefined || v === null ? '' : String(v);
  });
}
