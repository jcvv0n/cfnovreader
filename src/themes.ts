// 主题集中配置。新增主题只改这一处，CSS / 颜色块 / 模板都会跟着更新。

export interface Theme {
  /** 页面背景色 */
  bg: string;
  /** 正文文本色 */
  text: string;
  /** 链接色 */
  link: string;
  /** 顶部主题弹层背景（带透明度），不写就用页面 bg 加默认透明 */
  popupBg?: string;
}

export const THEMES = {
  default: { bg: '#e5e5e5', text: '#000000', link: '#000000', popupBg: 'rgba(255,255,255,0.9)' },
  dark: { bg: '#1e1e1e', text: '#808080', link: '#808080', popupBg: 'rgba(30,30,30,0.9)' },
  green: { bg: '#e5f5e5', text: '#003300', link: '#006600' },
  yellow: { bg: '#fffde7', text: '#333333', link: '#885500' },
  green2: { bg: '#d4edc9', text: '#333333', link: '#006600' },
} as const satisfies Record<string, Theme>;

export type ThemeName = keyof typeof THEMES;
export const DEFAULT_THEME: ThemeName = 'default';

export function isTheme(name: string): name is ThemeName {
  return name in THEMES;
}

export function resolveTheme(name: string | null | undefined): ThemeName {
  return name && isTheme(name) ? name : DEFAULT_THEME;
}

export function getTheme(name: ThemeName): Theme {
  return THEMES[name] as Theme;
}

/** 注入到 <style> 顶部的主题样式片段。 */
export function getThemeCSS(name: ThemeName): string {
  const t: Theme = THEMES[name];
  // dark 主题里弹层背景特殊，其它主题默认就用浅色 popup，已在 .theme-option / #theme-popup
  // 的默认 CSS 中处理；这里只覆盖 body 主色与链接色，再针对有 popupBg 的主题追加弹层色。
  let css = `body { background-color: ${t.bg}; color: ${t.text}; font-family: SimHei; } a { color: ${t.link}; }`;
  if (t.popupBg && name !== 'default') {
    css += ` #theme-popup, #bottom-popup { background: ${t.popupBg}; }`;
  }
  return css;
}

/** 目录页里翻页输入框的文本色 / 背景色（沿用旧逻辑）。 */
export function getThemeInputColors(name: ThemeName): { bgColor: string; textColor: string } {
  const t = THEMES[name];
  return { bgColor: t.bg, textColor: t.text };
}

/** 三个公开模板共用的主题选择弹层 HTML（无 <div id="theme-popup">；只包含 .theme-option 列表）。 */
export function getThemeOptionsHTML(): string {
  return (Object.keys(THEMES) as ThemeName[])
    .map((name) => {
      const bg = THEMES[name].bg;
      return `<a class="theme-option" data-theme="${name}" style="background: ${bg};" data-check=""></a>`;
    })
    .join('\n  ');
}
