import { describe, it, expect } from 'vitest';
import {
  THEMES,
  resolveTheme,
  getThemeCSS,
  getThemeInputColors,
  getThemeOptionsHTML,
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
  });

  it('getThemeOptionsHTML 包含所有主题的色块', () => {
    const html = getThemeOptionsHTML();
    for (const name of Object.keys(THEMES)) {
      expect(html).toContain(`data-theme="${name}"`);
    }
    expect(html.match(/class="theme-option"/g)).toHaveLength(Object.keys(THEMES).length);
  });

  it('getThemeCSS 含 body 背景与链接色', () => {
    const css = getThemeCSS('dark');
    expect(css).toContain('background-color: #1e1e1e');
    expect(css).toContain('color: #808080');
    expect(css).toContain('a { color: #808080');
  });

  it('getThemeInputColors 与主题 bg/text 对齐', () => {
    expect(getThemeInputColors('green')).toEqual({ bgColor: '#e5f5e5', textColor: '#003300' });
    expect(getThemeInputColors('default')).toEqual({ bgColor: '#e5e5e5', textColor: '#000000' });
  });
});
