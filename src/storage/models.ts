// 公共数据模型，跨 storage/handlers/admin 共享。
//
// 弱化 pageNo：章节就是数组下标（1..count 连续整数），没有跳章、没有稀疏编号。
// 多章打包成一个 R2 shard object，正文页按章节号定位对应 shard。
// story_meta 只服务目录页（列标题 + 算总页数）。

export interface StoryOverview {
  storyId: string;
  storyName: string;
}

/** 单章：既是上传输入，也是 R2 shard object 中的一项。 */
export interface Chapter {
  title: string;
  content: string[];
}

export interface StoryStorageMeta {
  kind: 'r2-sharded';
  shardSize: number;
  shardCount: number;
}

/** 小说级元数据，存 KV。目录页专用：标题数组 + 总章数。 */
export interface StoryMeta {
  /** 总章数 = titles.length，冗余存一份省得每次取 length。 */
  count: number;
  titles: string[];
  storage?: StoryStorageMeta;
}
