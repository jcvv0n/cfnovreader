// R2 数据访问：多章一个 shard object，key 为 story:{storyId}:shard:{N}。
// 每个 shard 是 gzipped JSON {chapters:[{title, content}, ...]}。
//
// 弱化 pageNo：正文翻页纯靠 N±1，判尾章靠 meta.count（KV）；不做跳章/稀疏编号。
// 压缩用 Web 标准 CompressionStream（Workers 原生，无需 nodejs_compat）。

import type { Chapter, StoryMeta } from './models';

const PREFIX = 'story';
export const SHARD_CHAPTER_COUNT = 100;
const R2_DELETE_BATCH_SIZE = 1000;

const shardKey = (storyId: string, shardNo: number) => `${PREFIX}:${storyId}:shard:${shardNo}`;
const legacyChapterKey = (storyId: string, pageNo: number) => `${PREFIX}:${storyId}:${pageNo}`;

interface ChapterShard {
  chapters: Chapter[];
}

function shardNoForPage(pageNo: number, shardSize = SHARD_CHAPTER_COUNT): number {
  return Math.floor((pageNo - 1) / shardSize) + 1;
}

function offsetForPage(pageNo: number, shardSize = SHARD_CHAPTER_COUNT): number {
  return (pageNo - 1) % shardSize;
}

/** gzip 一段 UTF-8 文本。 */
async function gzip(text: string): Promise<Uint8Array> {
  const cs = new CompressionStream('gzip');
  const writer = cs.writable.getWriter();
  writer.write(new TextEncoder().encode(text));
  writer.close();
  const reader = cs.readable.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    total += value.byteLength;
  }
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.byteLength;
  }
  return out;
}

/** gunzip 回 UTF-8 文本。 */
async function gunzip(bytes: Uint8Array): Promise<string> {
  const ds = new DecompressionStream('gzip');
  const writer = ds.writable.getWriter();
  writer.write(bytes);
  writer.close();
  const reader = ds.readable.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    total += value.byteLength;
  }
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.byteLength;
  }
  return new TextDecoder().decode(out);
}

async function readGzJson<T>(obj: R2ObjectBody): Promise<T> {
  const gz = new Uint8Array(await obj.arrayBuffer());
  return JSON.parse(await gunzip(gz)) as T;
}

async function getShardedChapter(
  bucket: R2Bucket,
  storyId: string,
  pageNo: number,
  meta?: StoryMeta,
): Promise<Chapter | null> {
  const shardSize = meta?.storage?.shardSize ?? SHARD_CHAPTER_COUNT;
  const obj = await bucket.get(shardKey(storyId, shardNoForPage(pageNo, shardSize)));
  if (!obj) return null;
  const shard = await readGzJson<ChapterShard>(obj);
  return shard.chapters[offsetForPage(pageNo, shardSize)] ?? null;
}

async function getLegacyChapter(
  bucket: R2Bucket,
  storyId: string,
  pageNo: number,
): Promise<Chapter | null> {
  const obj = await bucket.get(legacyChapterKey(storyId, pageNo));
  if (!obj) return null;
  return await readGzJson<Chapter>(obj);
}

/** 读单章。不存在返回 null。 */
export async function getChapter(
  bucket: R2Bucket,
  storyId: string,
  pageNo: number,
  meta?: StoryMeta | null,
): Promise<Chapter | null> {
  if (meta?.storage?.kind === 'r2-sharded') {
    return await getShardedChapter(bucket, storyId, pageNo, meta);
  }
  return (
    (await getShardedChapter(bucket, storyId, pageNo)) ?? getLegacyChapter(bucket, storyId, pageNo)
  );
}

/** 写一个 shard。 */
async function putShard(
  bucket: R2Bucket,
  storyId: string,
  shardNo: number,
  chapters: Chapter[],
): Promise<void> {
  const gz = await gzip(JSON.stringify({ chapters } satisfies ChapterShard));
  await bucket.put(shardKey(storyId, shardNo), gz);
}

/** 整本写入：按 shard 写入，避免章节多时触发单次 invocation API 调用限制。 */
export async function putStory(
  bucket: R2Bucket,
  storyId: string,
  chapters: Chapter[],
  options: { concurrency?: number } = {},
): Promise<number> {
  const concurrency = Math.max(1, options.concurrency ?? 5);
  const shardCount = Math.ceil(chapters.length / SHARD_CHAPTER_COUNT);
  for (let i = 0; i < shardCount; i += concurrency) {
    const shardNos = Array.from(
      { length: Math.min(concurrency, shardCount - i) },
      (_, j) => i + j + 1,
    );
    await Promise.all(
      shardNos.map((shardNo) => {
        const start = (shardNo - 1) * SHARD_CHAPTER_COUNT;
        return putShard(
          bucket,
          storyId,
          shardNo,
          chapters.slice(start, start + SHARD_CHAPTER_COUNT),
        );
      }),
    );
  }
  return chapters.length;
}

function deleteKeys(bucket: R2Bucket, keys: string[]): Promise<void> {
  if (!keys.length) return Promise.resolve();
  return bucket.delete(keys);
}

async function deleteKeysInBatches(bucket: R2Bucket, keys: string[]): Promise<void> {
  for (let i = 0; i < keys.length; i += R2_DELETE_BATCH_SIZE) {
    await deleteKeys(bucket, keys.slice(i, i + R2_DELETE_BATCH_SIZE));
  }
}

/** 删除整本所有章节内容。meta 缺少 storage 时按旧版单章 key 批量删除。 */
export async function deleteStoryChapters(
  bucket: R2Bucket,
  storyId: string,
  metaOrCount: Pick<StoryMeta, 'count' | 'storage'> | number,
): Promise<void> {
  const meta = typeof metaOrCount === 'number' ? { count: metaOrCount } : metaOrCount;
  if (meta.storage?.kind === 'r2-sharded') {
    const keys = Array.from({ length: meta.storage.shardCount }, (_, i) =>
      shardKey(storyId, i + 1),
    );
    await deleteKeysInBatches(bucket, keys);
    return;
  }

  const keys = Array.from({ length: meta.count }, (_, i) => legacyChapterKey(storyId, i + 1));
  await deleteKeysInBatches(bucket, keys);
}

/** 由章节列表算 meta。 */
export function buildMeta(chapters: Chapter[]): StoryMeta {
  return {
    count: chapters.length,
    titles: chapters.map((c) => c.title),
    storage: {
      kind: 'r2-sharded',
      shardSize: SHARD_CHAPTER_COUNT,
      shardCount: Math.ceil(chapters.length / SHARD_CHAPTER_COUNT),
    },
  };
}
