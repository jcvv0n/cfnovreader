// Admin JSON API：书目增删 / 上传章节到 R2（分块存储）。

import type { Env } from '../../types';
import { badRequest, jsonOk, jsonError, requireStr } from '../../http';
import {
  type StoryOverview,
  type Chapter,
  listStories,
  saveStories,
  putStory,
  buildMeta,
  putStoryMeta,
  deleteStoryMeta,
  deleteAllStoryObjects,
  createStorageVersion,
} from '../../storage';

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const MAX_CHAPTERS = 20_000;

export function validateChapters(value: unknown): Chapter[] {
  if (!Array.isArray(value) || value.length === 0) throw badRequest('章节列表为空或格式错误');
  if (value.length > MAX_CHAPTERS) throw badRequest(`章节数不能超过 ${MAX_CHAPTERS}`);

  value.forEach((chapter, index) => {
    if (!chapter || typeof chapter !== 'object') throw badRequest(`第 ${index + 1} 章格式错误`);
    const item = chapter as Record<string, unknown>;
    if (typeof item.title !== 'string') throw badRequest(`第 ${index + 1} 章缺少 title`);
    if (!Array.isArray(item.content) || item.content.some((p) => typeof p !== 'string')) {
      throw badRequest(`第 ${index + 1} 章 content 必须是字符串数组`);
    }
  });

  const payloadBytes = new TextEncoder().encode(JSON.stringify(value)).byteLength;
  if (payloadBytes > MAX_UPLOAD_BYTES) {
    throw badRequest('章节内容不能超过 5 MB');
  }

  const chapters = value.map((chapter) => {
    const item = chapter as Record<string, unknown>;
    return { title: item.title as string, content: item.content as string[] };
  });
  return chapters;
}

export async function listStoriesAPI(body: Record<string, unknown>, env: Env): Promise<Response> {
  const namespace = requireStr(body, 'namespace');
  const stories = await listStories(env.NOV_KV, namespace);
  return jsonOk({ stories });
}

export async function createStoryAPI(body: Record<string, unknown>, env: Env): Promise<Response> {
  const namespace = requireStr(body, 'namespace');
  const storyId = requireStr(body, 'storyId');
  const storyName = requireStr(body, 'storyName');
  const stories = await listStories(env.NOV_KV, namespace);
  if (stories.find((s) => s.storyId === storyId)) {
    return jsonError('小说 ID 已存在');
  }
  stories.push({ storyId, storyName });
  await saveStories(env.NOV_KV, namespace, stories);
  return jsonOk();
}

export async function deleteStoryAPI(body: Record<string, unknown>, env: Env): Promise<Response> {
  const namespace = requireStr(body, 'namespace');
  const storyId = requireStr(body, 'storyId');
  const stories = await listStories(env.NOV_KV, namespace);
  const next = stories.filter((s: StoryOverview) => s.storyId !== storyId);
  await saveStories(env.NOV_KV, namespace, next);

  // 清理 R2 内容 + KV meta；按 prefix 清理所有版本，避免历史失败上传留下孤儿 shard。
  await deleteAllStoryObjects(env.NOV_BUCKET, storyId);
  await deleteStoryMeta(env.NOV_KV, storyId);
  return jsonOk();
}

export async function uploadStoryAPI(body: Record<string, unknown>, env: Env): Promise<Response> {
  const storyId = requireStr(body, 'storyId');
  const chapters = validateChapters(body.chapters);
  try {
    // 新上传使用独立版本的 shard key；只有全部写完后切换 meta，旧版本始终可读。
    // 不在这里删除旧版本，避免 KV 最终一致性下仍读到旧 meta 的边缘节点读不到 shard。
    const version = createStorageVersion();
    const newMeta = buildMeta(chapters, version);
    await putStory(env.NOV_BUCKET, storyId, chapters, { version });
    await putStoryMeta(env.NOV_KV, storyId, newMeta);
    return jsonOk({ count: chapters.length });
  } catch (error) {
    console.error('章节上传失败', error);
    return jsonError('上传失败', 500);
  }
}
