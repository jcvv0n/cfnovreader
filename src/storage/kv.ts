// KV 数据访问：
//   story_overview:{namespace} → 书单 [{storyId, storyName}, ...]
//   story_meta:{storyId}       → {count, titles:[...]}   （目录页用）
// Key schema 在这里集中维护，handler / admin 都从这里走。

import type { StoryOverview, StoryMeta } from './models';

const STORY_OVERVIEW_PREFIX = 'story_overview:';
const STORY_META_PREFIX = 'story_meta:';
const overviewKey = (namespace: string) => `${STORY_OVERVIEW_PREFIX}${namespace}`;
const metaKey = (storyId: string) => `${STORY_META_PREFIX}${storyId}`;

// ---- 书单 ----

export async function listStories(kv: KVNamespace, namespace: string): Promise<StoryOverview[]> {
  return (await kv.get<StoryOverview[]>(overviewKey(namespace), 'json')) ?? [];
}

export async function saveStories(
  kv: KVNamespace,
  namespace: string,
  stories: StoryOverview[],
): Promise<void> {
  await kv.put(overviewKey(namespace), JSON.stringify(stories));
}

/** 不存在时返回 null（区分"空数组"与"namespace 完全不存在"）。 */
export async function listStoriesOrNull(
  kv: KVNamespace,
  namespace: string,
): Promise<StoryOverview[] | null> {
  return await kv.get<StoryOverview[]>(overviewKey(namespace), 'json');
}

// ---- 小说元数据（章节标题列表 + 总章数）----

export async function getStoryMeta(kv: KVNamespace, storyId: string): Promise<StoryMeta | null> {
  return await kv.get<StoryMeta>(metaKey(storyId), 'json');
}

export async function putStoryMeta(
  kv: KVNamespace,
  storyId: string,
  meta: StoryMeta,
): Promise<void> {
  await kv.put(metaKey(storyId), JSON.stringify(meta));
}

export async function deleteStoryMeta(kv: KVNamespace, storyId: string): Promise<void> {
  await kv.delete(metaKey(storyId));
}
