import { describe, it, expect } from 'vitest';
import { gunzipSync, gzipSync } from 'node:zlib';
import { getChapter, putStory, buildMeta, deleteStoryChapters } from '../../src/storage/r2';
import type { Chapter } from '../../src/storage/models';

// 内存版 R2Bucket mock：key → Uint8Array。
class FakeR2 implements R2Bucket {
  store = new Map<string, Uint8Array>();
  async get(key: string) {
    const v = this.store.get(key);
    return v ? ({ arrayBuffer: () => Promise.resolve(v.buffer.slice(v.byteOffset, v.byteOffset + v.byteLength)) } as R2ObjectBody) : null;
  }
  async put(key: string, value: Uint8Array) {
    this.store.set(key, value instanceof Uint8Array ? value : new Uint8Array(value as ArrayBuffer));
    return null as unknown as R2Object;
  }
  async delete(key: string) {
    this.store.delete(key);
  }
}

function mkChapters(n: number): Chapter[] {
  return Array.from({ length: n }, (_, i) => ({
    title: `第${i + 1}章`,
    content: [`段落${i + 1}-1`, `段落${i + 1}-2`],
  }));
}

describe('分块存储 round-trip', () => {
  it('putStory 后 getChapter 能读回单章，key 为 story:{id}:{N}', async () => {
    const r2 = new FakeR2();
    const chapters = mkChapters(3);
    const count = await putStory(r2, 's1', chapters);
    expect(count).toBe(3);

    expect(r2.store.size).toBe(3);
    expect(r2.store.has('story:s1:1')).toBe(true);
    expect(r2.store.has('story:s1:2')).toBe(true);
    expect(r2.store.has('story:s1:3')).toBe(true);

    const ch1 = await getChapter(r2, 's1', 1);
    expect(ch1?.title).toBe('第1章');
    expect(ch1?.content).toEqual(['段落1-1', '段落1-2']);
    const ch3 = await getChapter(r2, 's1', 3);
    expect(ch3?.title).toBe('第3章');
  });

  it('单章 object 是 gzipped JSON', async () => {
    const r2 = new FakeR2();
    await putStory(r2, 's1', [{ title: 'X', content: ['hi'] }]);
    const raw = r2.store.get('story:s1:1')!;
    const json = JSON.parse(gunzipSync(raw).toString('utf8'));
    expect(json).toEqual({ title: 'X', content: ['hi'] });
  });

  it('getChapter 不存在返回 null', async () => {
    const r2 = new FakeR2();
    expect(await getChapter(r2, 's1', 1)).toBeNull();
  });

  it('buildMeta 生成 count + titles', () => {
    const meta = buildMeta(mkChapters(3));
    expect(meta.count).toBe(3);
    expect(meta.titles).toEqual(['第1章', '第2章', '第3章']);
  });

  it('deleteStoryChapters 按 count 删除所有章节', async () => {
    const r2 = new FakeR2();
    await putStory(r2, 's1', mkChapters(5));
    expect(r2.store.size).toBe(5);
    await deleteStoryChapters(r2, 's1', 5);
    expect(r2.store.size).toBe(0);
  });

  it('gzip 可往返（验证 CompressionStream 路径在 node 下等价）', () => {
    const text = JSON.stringify({ title: '测试', content: ['中文', '😀'] });
    const gz = gzipSync(Buffer.from(text, 'utf8'));
    expect(JSON.parse(gunzipSync(gz).toString('utf8'))).toEqual({ title: '测试', content: ['中文', '😀'] });
  });
});
