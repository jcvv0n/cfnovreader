import { describe, it, expect } from 'vitest';
import { render, escapeHtml } from '../../src/render';

describe('render', () => {
  it('替换所有 {{KEY}} 占位符', () => {
    expect(render('a={{A}} b={{B}}', { A: 1, B: 'x' })).toBe('a=1 b=x');
  });

  it('同一 key 多次出现都替换', () => {
    expect(render('{{X}}-{{X}}', { X: 'ok' })).toBe('ok-ok');
  });

  it('未提供的占位符替换为空串（不残留 {{}}）', () => {
    expect(render('a={{A}} b={{B}}', { A: 'x' })).toBe('a=x b=');
  });

  it('undefined / null 也归一为空串', () => {
    expect(render('{{A}}{{B}}', { A: undefined, B: null })).toBe('');
  });

  it('数字与字符串都能渲染', () => {
    expect(render('{{N}}-{{S}}', { N: 42, S: 'hi' })).toBe('42-hi');
  });

  it('{{KEY}} 默认 HTML 转义特殊字符', () => {
    expect(render('{{X}}', { X: '<script>alert(1)</script>' })).toBe(
      '&lt;script&gt;alert(1)&lt;/script&gt;',
    );
    expect(render('{{X}}', { X: '"onerror="x' })).toBe('&quot;onerror=&quot;x');
  });

  it('{{{RAW:KEY}}} 不转义，用于受信片段', () => {
    expect(render('{{{RAW:HTML}}}', { HTML: '<p>hi</p>' })).toBe('<p>hi</p>');
    expect(render('{{A}} and {{{RAW:B}}}', { A: '<b>', B: '<i>' })).toBe(
      '&lt;b&gt; and <i>',
    );
  });

  it('RAW 片段中的字面量占位符不会被二次替换', () => {
    expect(render('{{{RAW:HTML}}}', { HTML: '{{NOT_A_VAR}}' })).toBe('{{NOT_A_VAR}}');
  });
});

describe('escapeHtml', () => {
  it('转义 & < > " \'', () => {
    expect(escapeHtml('&<>"\'')).toBe('&amp;&lt;&gt;&quot;&#39;');
  });
  it('无特殊字符原样返回', () => {
    expect(escapeHtml('hello 世界 123')).toBe('hello 世界 123');
  });
});
