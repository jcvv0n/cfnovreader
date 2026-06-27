// 公共数据模型，跨 storage/handlers/admin 共享。
//
// 弱化 pageNo：章节就是数组下标（1..count 连续整数），没有跳章、没有稀疏编号。
// 单章 R2 object 自包含 title + content，正文页只读它一个 object，零元数据读。
// story_meta 只服务目录页（列标题 + 算总页数）。

export interface StoryOverview {
  storyId: string;
  storyName: string;
}

/** 单章：既是上传输入，也是 R2 单章 object 的内容（gzipped JSON）。 */
export interface Chapter {
  title: string;
  content: string[];
}

/** 小说级元数据，存 KV。目录页专用：标题数组 + 总章数。 */
export interface StoryMeta {
  /** 总章数 = titles.length，冗余存一份省得每次取 length。 */
  count: number;
  titles: string[];
}
