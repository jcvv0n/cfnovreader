import { describe, it, expect } from 'vitest';
import {
  THEMES,
  resolveTheme,
  getThemeCSS,
  getThemeInputColors,
  getThemeOptionsHTML,
  getThemePreferenceScript,
  isTheme,
} from '../../src/themes';

describe('themes', () => {
  it('resolveTheme: 合法名原样返回，非法/空回 default', () => {
    expect(resolveTheme('dark')).toBe('dark');
    expect(resolveTheme(null)).toBe('default');
    expect(resolveTheme('not-a-theme')).toBe('default');
  });

  it('isTheme 收窄类型', () => {
    expect(isTheme('green')).toBe(true);
    expect(isTheme('xyz')).toBe(false);
    expect(isTheme('toString')).toBe(false);
    expect(isTheme('__proto__')).toBe(false);
  });

  it('getThemeOptionsHTML 包含所有主题的色块', () => {
    const html = getThemeOptionsHTML();
    for (const name of Object.keys(THEMES)) {
      expect(html).toContain(`data-theme="${name}"`);
    }
    expect(html.match(/class="theme-option"/g)).toHaveLength(Object.keys(THEMES).length);
    expect(html).toContain('aria-label="深色"');
  });

  it('主题偏好脚本使用受支持的主题名并支持系统主题', () => {
    const script = getThemePreferenceScript();
    expect(script).toContain('cfnovreader-theme');
    expect(script).toContain('__CFNOV_READER_THEMES__');
    expect(script).toContain('prefers-color-scheme');
    expect(script).toContain('green2');
  });

  it('getThemeCSS 含 body 背景与链接色', () => {
    const css = getThemeCSS('dark');
    expect(css).toContain('--theme-bg: #1e1e1e');
    expect(css).toContain('--theme-text: #d6d6d6');
    expect(css).toContain('--theme-link: #8ab4f8');
    expect(css).toContain('background-color: var(--theme-bg)');
    expect(css).toContain('--theme-border: #5f5f5f');
  });

  it('getThemeInputColors 与主题 bg/text 对齐', () => {
    expect(getThemeInputColors('green')).toEqual({ bgColor: '#e5f5e5', textColor: '#003300' });
    expect(getThemeInputColors('default')).toEqual({ bgColor: '#e5e5e5', textColor: '#000000' });
  });
});
