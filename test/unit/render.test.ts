import { describe, it, expect } from 'vitest';
import { render } from '../../src/render';

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
});
