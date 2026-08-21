// 主题集中配置。新增主题只改这一处，CSS / 颜色块 / 模板都会跟着更新。

export interface Theme {
  /** 页面背景色 */
  bg: string;
  /** 正文文本色 */
  text: string;
  /** 链接色 */
  link: string;
  /** 控件和导航的表面色 */
  surface: string;
  /** 边框色 */
  border: string;
  /** 弱化文本色 */
  muted: string;
  /** 键盘焦点色 */
  focus: string;
  /** 顶部主题弹层背景（带透明度） */
  popupBg: string;
}

export const THEMES = {
  default: {
    bg: '#e5e5e5',
    text: '#000000',
    link: '#000000',
    surface: '#ffffff',
    border: '#b8b8b8',
    muted: '#666666',
    focus: '#005fcc',
    popupBg: 'rgba(255,255,255,0.94)',
  },
  dark: {
    bg: '#1e1e1e',
    text: '#d6d6d6',
    link: '#8ab4f8',
    surface: '#2a2a2a',
    border: '#5f5f5f',
    muted: '#b0b0b0',
    focus: '#8ab4f8',
    popupBg: 'rgba(30,30,30,0.96)',
  },
  green: {
    bg: '#e5f5e5',
    text: '#003300',
    link: '#006600',
    surface: '#f5fff5',
    border: '#9ab99a',
    muted: '#426342',
    focus: '#006600',
    popupBg: 'rgba(245,255,245,0.96)',
  },
  yellow: {
    bg: '#fffde7',
    text: '#333333',
    link: '#885500',
    surface: '#fffef3',
    border: '#c8bd8a',
    muted: '#6e674b',
    focus: '#885500',
    popupBg: 'rgba(255,254,243,0.96)',
  },
  green2: {
    bg: '#d4edc9',
    text: '#333333',
    link: '#006600',
    surface: '#eff9eb',
    border: '#9bb78f',
    muted: '#50634a',
    focus: '#006600',
    popupBg: 'rgba(239,249,235,0.96)',
  },
} as const satisfies Record<string, Theme>;

export type ThemeName = keyof typeof THEMES;
export const DEFAULT_THEME: ThemeName = 'default';

export const THEME_LABELS = {
  default: '浅色',
  dark: '深色',
  green: '护眼绿',
  yellow: '米黄',
  green2: '绿色',
} as const satisfies Record<ThemeName, string>;

export function isTheme(name: string): name is ThemeName {
  return Object.prototype.hasOwnProperty.call(THEMES, name);
}

export function resolveTheme(name: string | null | undefined): ThemeName {
  return name && isTheme(name) ? name : DEFAULT_THEME;
}

export function getTheme(name: ThemeName): Theme {
  return THEMES[name] as Theme;
}

// --- 预计算：主题表是编译期常量，字符串只生成一次 ---

function buildThemeCSS(name: ThemeName): string {
  const t: Theme = THEMES[name];
  const colorScheme = name === 'dark' ? 'dark' : 'light';
  return `:root { --theme-bg: ${t.bg}; --theme-text: ${t.text}; --theme-link: ${t.link}; --theme-surface: ${t.surface}; --theme-border: ${t.border}; --theme-muted: ${t.muted}; --theme-focus: ${t.focus}; --theme-popup-bg: ${t.popupBg}; --theme-color-scheme: ${colorScheme}; color-scheme: var(--theme-color-scheme); } body { background-color: var(--theme-bg); color: var(--theme-text); font-family: SimHei; } a { color: var(--theme-link); } #theme-popup, #bottom-popup { background: var(--theme-popup-bg); border-color: var(--theme-border); }`;
}

function buildThemeOptionsHTML(): string {
  return (Object.keys(THEMES) as ThemeName[])
    .map((name) => {
      const bg = THEMES[name].bg;
      const label = THEME_LABELS[name];
      return `<a href="?theme=${name}" class="theme-option" data-theme="${name}" style="background: ${bg};" data-check="" aria-current="false" aria-label="${label}" title="${label}"></a>`;
    })
    .join('\n  ');
}

function buildThemePreferenceScript(): string {
  const themeNames = JSON.stringify(Object.keys(THEMES));
  const themeData = JSON.stringify(THEMES);
  return `<script>(function () { try { const themes = ${themeData}; window.__CFNOV_READER_THEMES__ = themes; const url = new URL(window.location.href); if (!url.searchParams.has('theme')) { const saved = localStorage.getItem('cfnovreader-theme'); const hasSaved = saved && ${themeNames}.includes(saved); const followsDarkSystem = !hasSaved && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches; const preferred = hasSaved ? saved : followsDarkSystem ? 'dark' : ''; if (preferred && themes[preferred]) { const palette = themes[preferred]; document.documentElement.dataset.theme = preferred; Object.entries({ '--theme-bg': palette.bg, '--theme-text': palette.text, '--theme-link': palette.link, '--theme-surface': palette.surface, '--theme-border': palette.border, '--theme-muted': palette.muted, '--theme-focus': palette.focus, '--theme-popup-bg': palette.popupBg, '--theme-color-scheme': preferred === 'dark' ? 'dark' : 'light' }).forEach(([name, value]) => document.documentElement.style.setProperty(name, value)); } } } catch (_) {} })();</script>`;
}

const THEME_CSS_CACHE = new Map<ThemeName, string>(
  (Object.keys(THEMES) as ThemeName[]).map((name) => [name, buildThemeCSS(name)]),
);

const THEME_OPTIONS_HTML = buildThemeOptionsHTML();
const THEME_PREFERENCE_SCRIPT = buildThemePreferenceScript();

/** 注入到 <style> 顶部的主题样式片段。 */
export function getThemeCSS(name: ThemeName): string {
  return THEME_CSS_CACHE.get(name) ?? THEME_CSS_CACHE.get('default')!;
}

/** 目录页里翻页输入框的文本色 / 背景色。 */
export function getThemeInputColors(name: ThemeName): { bgColor: string; textColor: string } {
  const t = THEMES[name];
  return { bgColor: t.bg, textColor: t.text };
}

/** 公开模板共用的主题选择项 HTML。 */
export function getThemeOptionsHTML(): string {
  return THEME_OPTIONS_HTML;
}

/** 在首次绘制前把已保存或系统主题应用到 CSS 变量，避免服务端默认主题造成闪烁。 */
export function getThemePreferenceScript(): string {
  return THEME_PREFERENCE_SCRIPT;
}
