import { describe, it, expect } from 'vitest';
import { gunzipSync, gzipSync } from 'node:zlib';
import {
  getChapter,
  putStory,
  buildMeta,
  deleteStoryChapters,
  SHARD_CHAPTER_COUNT,
} from '../../src/storage/r2';
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
  async delete(keys: string | string[]) {
    for (const key of Array.isArray(keys) ? keys : [keys]) {
      this.store.delete(key);
    }
  }
}

function mkChapters(n: number): Chapter[] {
  return Array.from({ length: n }, (_, i) => ({
    title: `第${i + 1}章`,
    content: [`段落${i + 1}-1`, `段落${i + 1}-2`],
  }));
}

describe('分块存储 round-trip', () => {
  it('putStory 后 getChapter 能从 shard 读回单章', async () => {
    const r2 = new FakeR2();
    const chapters = mkChapters(SHARD_CHAPTER_COUNT + 3);
    const count = await putStory(r2, 's1', chapters);
    const meta = buildMeta(chapters);
    expect(count).toBe(SHARD_CHAPTER_COUNT + 3);

    expect(r2.store.size).toBe(2);
    expect(r2.store.has('story:s1:shard:1')).toBe(true);
    expect(r2.store.has('story:s1:shard:2')).toBe(true);

    const ch1 = await getChapter(r2, 's1', 1, meta);
    expect(ch1?.title).toBe('第1章');
    expect(ch1?.content).toEqual(['段落1-1', '段落1-2']);
    const last = await getChapter(r2, 's1', SHARD_CHAPTER_COUNT + 3, meta);
    expect(last?.title).toBe(`第${SHARD_CHAPTER_COUNT + 3}章`);
  });

  it('shard object 是 gzipped JSON', async () => {
    const r2 = new FakeR2();
    await putStory(r2, 's1', [{ title: 'X', content: ['hi'] }]);
    const raw = r2.store.get('story:s1:shard:1')!;
    const json = JSON.parse(gunzipSync(raw).toString('utf8'));
    expect(json).toEqual({ chapters: [{ title: 'X', content: ['hi'] }] });
  });

  it('没有新 meta 时兼容读取旧版单章 object', async () => {
    const r2 = new FakeR2();
    r2.store.set('story:s1:1', gzipSync(JSON.stringify({ title: '旧章', content: ['old'] })));
    const ch = await getChapter(r2, 's1', 1);
    expect(ch).toEqual({ title: '旧章', content: ['old'] });
  });

  it('getChapter 不存在返回 null', async () => {
    const r2 = new FakeR2();
    expect(await getChapter(r2, 's1', 1)).toBeNull();
  });

  it('buildMeta 生成 count + titles', () => {
    const meta = buildMeta(mkChapters(3));
    expect(meta.count).toBe(3);
    expect(meta.titles).toEqual(['第1章', '第2章', '第3章']);
    expect(meta.storage).toEqual({ kind: 'r2-sharded', shardSize: SHARD_CHAPTER_COUNT, shardCount: 1 });
  });

  it('deleteStoryChapters 按 shard 删除新格式内容', async () => {
    const r2 = new FakeR2();
    const chapters = mkChapters(SHARD_CHAPTER_COUNT + 1);
    await putStory(r2, 's1', chapters);
    expect(r2.store.size).toBe(2);
    await deleteStoryChapters(r2, 's1', buildMeta(chapters));
    expect(r2.store.size).toBe(0);
  });

  it('deleteStoryChapters 批量删除旧版单章内容', async () => {
    const r2 = new FakeR2();
    r2.store.set('story:s1:1', gzipSync('{}'));
    r2.store.set('story:s1:2', gzipSync('{}'));
    await deleteStoryChapters(r2, 's1', { count: 2 });
    expect(r2.store.size).toBe(0);
  });

  it('gzip 可往返（验证 CompressionStream 路径在 node 下等价）', () => {
    const text = JSON.stringify({ title: '测试', content: ['中文', '😀'] });
    const gz = gzipSync(Buffer.from(text, 'utf8'));
    expect(JSON.parse(gunzipSync(gz).toString('utf8'))).toEqual({ title: '测试', content: ['中文', '😀'] });
  });
});
