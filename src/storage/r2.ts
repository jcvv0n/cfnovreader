// R2 数据访问：单章一个 object，key 为 story:{storyId}:{N}（N = 1..count 连续）。
// 每章是 gzipped JSON {title, content}，自包含，正文页只读它一个 object。
//
// 弱化 pageNo：正文翻页纯靠 N±1，判尾章靠 meta.count（KV）；不做跳章/稀疏编号。
// 压缩用 Web 标准 CompressionStream（Workers 原生，无需 nodejs_compat）。

import type { Chapter, StoryMeta } from './models';

const PREFIX = 'story';
const chapterKey = (storyId: string, pageNo: number) => `${PREFIX}:${storyId}:${pageNo}`;

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

/** 读单章。不存在返回 null。 */
export async function getChapter(
  bucket: R2Bucket,
  storyId: string,
  pageNo: number,
): Promise<Chapter | null> {
  const obj = await bucket.get(chapterKey(storyId, pageNo));
  if (!obj) return null;
  const gz = new Uint8Array(await obj.arrayBuffer());
  return JSON.parse(await gunzip(gz)) as Chapter;
}

/** 写单章。 */
async function putChapter(
  bucket: R2Bucket,
  storyId: string,
  pageNo: number,
  ch: Chapter,
): Promise<void> {
  const gz = await gzip(JSON.stringify(ch));
  await bucket.put(chapterKey(storyId, pageNo), gz);
}

/** 整本写入：并发分批写单章。返回章节数。 */
export async function putStory(
  bucket: R2Bucket,
  storyId: string,
  chapters: Chapter[],
  options: { concurrency?: number } = {},
): Promise<number> {
  const concurrency = Math.max(1, options.concurrency ?? 20);
  for (let i = 0; i < chapters.length; i += concurrency) {
    const batch = chapters.slice(i, i + concurrency);
    await Promise.all(batch.map((ch, j) => putChapter(bucket, storyId, i + j + 1, ch)));
  }
  return chapters.length;
}

/** 删除整本所有章节。count 来自 meta。 */
export async function deleteStoryChapters(
  bucket: R2Bucket,
  storyId: string,
  count: number,
  options: { concurrency?: number } = {},
): Promise<void> {
  const concurrency = Math.max(1, options.concurrency ?? 20);
  for (let i = 1; i <= count; i += concurrency) {
    const batch: number[] = [];
    for (let j = i; j < i + concurrency && j <= count; j++) batch.push(j);
    await Promise.all(batch.map((n) => bucket.delete(chapterKey(storyId, n))));
  }
}

/** 由章节列表算 meta。 */
export function buildMeta(chapters: Chapter[]): StoryMeta {
  return { count: chapters.length, titles: chapters.map((c) => c.title) };
}
