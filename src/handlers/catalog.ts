// /r/{namespace}/cat/{storyId}?p=N 处理：分页目录。
// 弱化 pageNo：章节就是 1..count 的连续编号，标题来自 KV story_meta。
// 目录页只读 KV meta（几 KB），不碰 R2。

import catalogTemplate from '../templates/catalog.html';
import { render } from '../render';
import { htmlResponse, notFound, parsePageNo } from '../http';
import { getStoryMeta, listStoriesOrNull } from '../storage';
import { getThemeCSS, getThemeInputColors, getThemeOptionsHTML, resolveTheme } from '../themes';
import { CATALOG_PAGE_SIZE, totalCatalogPages } from './pagination';
import type { RouteHandler } from '../router';

export const catalogHandler: RouteHandler = async (request, env, params) => {
  const url = new URL(request.url);
  const namespace = params.namespace!;
  const storyId = params.storyId!;

  const stories = await listStoriesOrNull(env.NOV_KV, namespace);
  if (!stories) throw notFound('Invalid Page');
  const story = stories.find((s) => s.storyId === storyId);
  if (!story) throw notFound('Invalid Page');

  const meta = await getStoryMeta(env.NOV_KV, storyId);
  if (!meta || meta.count === 0) throw notFound('Invalid Page');

  const theme = resolveTheme(url.searchParams.get('theme'));
  const totalPages = Math.max(1, totalCatalogPages(meta.count));
  const currentPage = Math.min(parsePageNo(url.searchParams.get('p'), 1), totalPages);

  const start = (currentPage - 1) * CATALOG_PAGE_SIZE;
  const end = Math.min(start + CATALOG_PAGE_SIZE, meta.count);
  const prev = Math.max(1, currentPage - 1);
  const next = Math.min(totalPages, currentPage + 1);
  const disabledTop = currentPage === 1 ? 'disabled' : '';
  const disabledBottom = currentPage === totalPages ? 'disabled' : '';

  // 目录条目：pageNo = 数组下标 + 1；标题来自 meta.titles
  const items: string[] = [];
  for (let i = start; i < end; i++) {
    const pageNo = i + 1;
    const title = meta.titles[i] || `第${pageNo}章`;
    items.push(
      `<p id="p${pageNo}"><a href="/r/${namespace}/cont/${storyId}?p=${pageNo}&theme=${theme}">${title}</a></p>`,
    );
  }
  const catalogHtml = items.join('\n');
  const overviewLink = `<p><a href="/r/${namespace}/stos/1?theme=${theme}#s${story.storyId}">小说一览</a></p>`;
  const inputColors = getThemeInputColors(theme);

  return htmlResponse(
    render(catalogTemplate, {
      NAMESPACE: namespace,
      STORY_ID: storyId,
      STORY_NAME: story.storyName,
      STORY_CATALOG: catalogHtml,
      OVERVIEW_PAGE: overviewLink,
      CURRENT_PAGE: currentPage,
      TOTAL_PAGES: totalPages,
      PREV_PAGE: prev,
      NEXT_PAGE: next,
      FIRST_DISABLED: disabledTop,
      PREV_DISABLED: disabledTop,
      NEXT_DISABLED: disabledBottom,
      LAST_DISABLED: disabledBottom,
      THEME: theme,
      THEME_STYLE: getThemeCSS(theme),
      THEME_OPTIONS: getThemeOptionsHTML(),
      INPUT_BG_COLOR: inputColors.bgColor,
      INPUT_TEXT_COLOR: inputColors.textColor,
    }),
    { headers: { 'Cache-Control': 'public, max-age=60' } },
  );
};
