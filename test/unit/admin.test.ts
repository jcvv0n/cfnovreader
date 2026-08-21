import { describe, expect, it } from 'vitest';
import { validateChapters } from '../../src/handlers/admin/api';

describe('admin chapter validation', () => {
  it('接受数组格式的合法章节', () => {
    const chapters = [{ title: '第一章', content: ['段落一', '段落二'] }];
    expect(validateChapters(chapters)).toEqual(chapters);
  });

  it('拒绝缺少 title 或错误 content 类型的章节', () => {
    expect(() => validateChapters([{ content: ['正文'] }])).toThrow('缺少 title');
    expect(() => validateChapters([{ title: '第一章', content: ['正文', 1] }])).toThrow(
      'content 必须是字符串数组',
    );
  });

  it('拒绝超过服务端大小限制的章节', () => {
    expect(() => validateChapters([{ title: '大章节', content: ['x'.repeat(5 * 1024 * 1024)] }])).toThrow(
      '5 MB',
    );
  });
});
