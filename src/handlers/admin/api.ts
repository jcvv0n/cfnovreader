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
  getStoryMeta,
  deleteStoryMeta,
  deleteStoryChapters,
} from '../../storage';

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

  // 清理 R2 分块 + KV meta（旧的整存格式读不到 count，跳过分块删除）
  const meta = await getStoryMeta(env.NOV_KV, storyId);
  if (meta) {
    await deleteStoryChapters(env.NOV_BUCKET, storyId, meta.count);
    await deleteStoryMeta(env.NOV_KV, storyId);
  }
  return jsonOk();
}

export async function uploadStoryAPI(body: Record<string, unknown>, env: Env): Promise<Response> {
  const storyId = requireStr(body, 'storyId');
  const chapters = body.chapters;
  if (!Array.isArray(chapters)) throw badRequest('缺少 chapters');
  if (chapters.length === 0) return jsonError('章节列表为空');
  try {
    // 上传覆盖：若已有旧分块，先按旧 count 清理，避免残留多余章节
    const oldMeta = await getStoryMeta(env.NOV_KV, storyId);
    if (oldMeta && oldMeta.count > chapters.length) {
      await deleteStoryChapters(env.NOV_BUCKET, storyId, oldMeta.count);
    }
    await putStory(env.NOV_BUCKET, storyId, chapters as Chapter[]);
    await putStoryMeta(env.NOV_KV, storyId, buildMeta(chapters as Chapter[]));
    return jsonOk({ count: chapters.length });
  } catch (e) {
    return jsonError(String(e));
  }
}
