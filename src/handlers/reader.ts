// /r/{namespace}/cont/{storyId}?p=N 处理：正文页 + 上一章/下一章/目录导航。
// 弱化 pageNo：按章节号定位 R2 shard，再取 shard 内单章；
// 上一章 N-1、下一章 N+1 纯算；判尾章读 KV meta.count。

import readerTemplate from '../templates/reader.html';
import themeClient from '../templates/theme.client.js';
import readerClient from '../templates/reader.client.js';
import { render, escapeHtml } from '../render';
import { htmlResponse, notFound, parsePageNo } from '../http';
import { getChapter, getStoryMeta, listStoriesOrNull } from '../storage';
import {
  getThemeCSS,
  getThemeOptionsHTML,
  getThemePreferenceScript,
  resolveTheme,
} from '../themes';
import { CATALOG_PAGE_SIZE } from './pagination';
import type { RouteHandler } from '../router';

export const readerHandler: RouteHandler = async (request, env, params) => {
  const url = new URL(request.url);
  const namespace = params.namespace!;
  const storyId = params.storyId!;
  const encNs = encodeURIComponent(namespace);
  const encSid = encodeURIComponent(storyId);

  const requestedPageNo = parsePageNo(url.searchParams.get('p'), 1);

  // 并行读取 stories（校验合法性）和 meta（定位 shard）
  const [stories, meta] = await Promise.all([
    listStoriesOrNull(env.NOV_KV, namespace),
    getStoryMeta(env.NOV_KV, storyId),
  ]);
  if (!stories) throw notFound('Invalid Page');
  const story = stories.find((s) => s.storyId === storyId);
  if (!story) throw notFound('Invalid Page');

  // 超范围 pageNo 提前拒绝，避免无谓的 R2 读取
  const pageNo =
    meta && url.searchParams.get('resume') === '1' && meta.count > 0
      ? Math.min(requestedPageNo, meta.count)
      : requestedPageNo;
  if (meta && pageNo > meta.count) throw notFound('Invalid PageNo');

  const chapter = await getChapter(env.NOV_BUCKET, storyId, pageNo, meta);
  if (!chapter) throw notFound('Invalid PageNo');

  const count = meta?.count ?? pageNo;
  const hasPrev = pageNo > 1;
  const hasNext = pageNo < count;

  const theme = resolveTheme(url.searchParams.get('theme'));
  const catalogPage = Math.ceil(pageNo / CATALOG_PAGE_SIZE);
  const storyTitle = `${story.storyName} ${chapter.title || `第${pageNo}章`}`;
  const contentText = chapter.content.map((p) => `<p>${escapeHtml(p)}</p>`).join('');
  const progressPercent = count > 0 ? Math.round((pageNo / count) * 100) : 0;

  const contHref = (n: number) => `/r/${encNs}/cont/${encSid}?p=${n}&theme=${theme}`;
  const catalogHref = `/r/${encNs}/cat/${encSid}?p=${catalogPage}&theme=${theme}#p${pageNo}`;

  // 左右两侧保留视觉快捷入口，右侧副本对辅助技术隐藏，避免重复播报。
  const buildFooter = (
    direction: 'next' | 'previous',
    label: string,
    n: number,
  ) => `<nav class="reader-nav reader-nav--${direction}" aria-label="${label}快捷导航">
 <a class="reader-nav__chapter" href="${contHref(n)}" aria-label="${label}">${label}</a>
 <a class="reader-nav__catalog" href="${catalogHref}" aria-label="返回目录">目录</a>
 <a class="reader-nav__chapter" href="${contHref(n)}" aria-hidden="true" tabindex="-1">${label}</a>
 </nav>`;

  const nextPageTag = hasNext ? buildFooter('next', '下一章', pageNo + 1) : '';
  // 模板先输出下一章、再输出上一章，保持常用操作在上方。
  const prePageTag = hasPrev ? buildFooter('previous', '上一章', pageNo - 1) : '';
  const nextPageTagInner = hasNext
    ? `<a class="reader-nav__quick reader-nav__quick--next" href="${contHref(pageNo + 1)}" aria-label="下一章">下一章</a>`
    : '';
  const prePageTagInner = hasPrev
    ? `<a class="reader-nav__quick reader-nav__quick--previous" href="${contHref(pageNo - 1)}" aria-label="上一章">上一章</a>`
    : '';

  return htmlResponse(
    render(readerTemplate, {
      STORY_NAME: story.storyName,
      STORY_TITLE: storyTitle,
      CONTENT_TEXT: contentText,
      TOTAL_CHAPTERS: count,
      PROGRESS_PERCENT: progressPercent,
      NEXT_PAGE_TAG: nextPageTag,
      PRE_PAGE_TAG: prePageTag,
      NEXT_PAGE_TAG_INNER: nextPageTagInner,
      PRE_PAGE_TAG_INNER: prePageTagInner,
      PAGE_NO: pageNo,
      CATALOG_PAGE: catalogPage,
      NAMESPACE: namespace,
      STORY_ID: storyId,
      ENC_NAMESPACE: encNs,
      ENC_STORY_ID: encSid,
      THEME: theme,
      THEME_PRELOAD: getThemePreferenceScript(),
      THEME_STYLE: getThemeCSS(theme),
      THEME_OPTIONS: getThemeOptionsHTML(),
      THEME_SCRIPT: themeClient,
      READER_SCRIPT: readerClient,
    }),
    {
      // 上传后应立即读取新版本，避免浏览器/CDN 继续返回旧正文。
      headers: { 'Cache-Control': 'no-store' },
    },
  );
};
