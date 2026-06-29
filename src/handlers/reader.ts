// /r/{namespace}/cont/{storyId}?p=N 处理：正文页 + 上一章/下一章/目录导航。
// 弱化 pageNo：按章节号定位 R2 shard，再取 shard 内单章；
// 上一章 N-1、下一章 N+1 纯算；判尾章读 KV meta.count。

import readerTemplate from '../templates/reader.html';
import { render } from '../render';
import { htmlResponse, notFound, parsePageNo } from '../http';
import { getChapter, getStoryMeta, listStoriesOrNull } from '../storage';
import { getThemeCSS, getThemeOptionsHTML, resolveTheme } from '../themes';
import { CATALOG_PAGE_SIZE } from './pagination';
import type { RouteHandler } from '../router';

export const readerHandler: RouteHandler = async (request, env, params) => {
  const url = new URL(request.url);
  const namespace = params.namespace!;
  const storyId = params.storyId!;

  const stories = await listStoriesOrNull(env.NOV_KV, namespace);
  if (!stories) throw notFound('Invalid Page');
  const story = stories.find((s) => s.storyId === storyId);
  if (!story) throw notFound('Invalid Page');

  const pageNo = parsePageNo(url.searchParams.get('p'), 1);

  const meta = await getStoryMeta(env.NOV_KV, storyId);
  const chapter = await getChapter(env.NOV_BUCKET, storyId, pageNo, meta);
  if (!chapter) throw notFound('Invalid PageNo');

  const count = meta?.count ?? pageNo;
  const hasPrev = pageNo > 1;
  const hasNext = pageNo < count;

  const theme = resolveTheme(url.searchParams.get('theme'));
  const catalogPage = Math.ceil(pageNo / CATALOG_PAGE_SIZE);
  const storyTitle = `${story.storyName} ${chapter.title || `第${pageNo}章`}`;
  const contentText = chapter.content.map((p) => `<p>${p}</p>`).join('');

  const contHref = (n: number) => `/r/${namespace}/cont/${storyId}?p=${n}&theme=${theme}`;
  const catalogHref = `/r/${namespace}/cat/${storyId}?p=${catalogPage}&theme=${theme}#p${pageNo}`;

  const buildFooter = (label: string, n: number) => `<div align="center">
<a href="${contHref(n)}">${label}</a>
&nbsp&nbsp&nbsp&nbsp<a href="${catalogHref}">目录</a>
&nbsp&nbsp&nbsp&nbsp<a href="${contHref(n)}">${label}</a>
</div>
</br></br>`;

  const nextPageTag = hasNext ? buildFooter('下一章', pageNo + 1) : '';
  const prePageTag = hasPrev ? buildFooter('上一章', pageNo - 1) : '';
  const nextPageTagInner = hasNext ? `<a href="${contHref(pageNo + 1)}">下一章</a>` : '';
  const prePageTagInner = hasPrev ? `<a href="${contHref(pageNo - 1)}">上一章</a>` : '';

  return htmlResponse(
    render(readerTemplate, {
      STORY_TITLE: storyTitle,
      CONTENT_TEXT: contentText,
      NEXT_PAGE_TAG: nextPageTag,
      PRE_PAGE_TAG: prePageTag,
      NEXT_PAGE_TAG_INNER: nextPageTagInner,
      PRE_PAGE_TAG_INNER: prePageTagInner,
      PAGE_NO: pageNo,
      CATALOG_PAGE: catalogPage,
      NAMESPACE: namespace,
      STORY_ID: storyId,
      THEME: theme,
      THEME_STYLE: getThemeCSS(theme),
      THEME_OPTIONS: getThemeOptionsHTML(),
    }),
    {
      // 正文不易变，缓存更久；admin 上传后通过 cache.delete() 主动清。
      headers: { 'Cache-Control': 'public, max-age=86400' },
    },
  );
};
