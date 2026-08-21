// /r/{namespace}/cat/{storyId}?p=N 处理：分页目录。
// 弱化 pageNo：章节就是 1..count 的连续编号，标题来自 KV story_meta。
// 目录页只读 KV meta（几 KB），不碰 R2。

import catalogTemplate from '../templates/catalog.html';
import themeClient from '../templates/theme.client.js';
import { render, escapeHtml } from '../render';
import { htmlResponse, notFound, parsePageNo } from '../http';
import { getStoryMeta, listStoriesOrNull } from '../storage';
import {
  getThemeCSS,
  getThemeOptionsHTML,
  getThemePreferenceScript,
  resolveTheme,
} from '../themes';
import { CATALOG_PAGE_SIZE, totalCatalogPages } from './pagination';
import type { RouteHandler } from '../router';

export const catalogHandler: RouteHandler = async (request, env, params) => {
  const url = new URL(request.url);
  const namespace = params.namespace!;
  const storyId = params.storyId!;
  const encNs = encodeURIComponent(namespace);
  const encSid = encodeURIComponent(storyId);

  // 提前解析页码，非法值直接 400，避免无谓的 KV 读取
  const rawPageNo = parsePageNo(url.searchParams.get('p'), 1);

  // 并行读取 stories（校验合法性）和 meta（分页数据）
  const [stories, meta] = await Promise.all([
    listStoriesOrNull(env.NOV_KV, namespace),
    getStoryMeta(env.NOV_KV, storyId),
  ]);
  if (!stories) throw notFound('Invalid Page');
  const story = stories.find((s) => s.storyId === storyId);
  if (!story) throw notFound('Invalid Page');
  if (!meta || meta.count === 0) throw notFound('Invalid Page');

  const theme = resolveTheme(url.searchParams.get('theme'));
  const totalPages = Math.max(1, totalCatalogPages(meta.count));
  const currentPage = Math.min(rawPageNo, totalPages);

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
    const title = escapeHtml(meta.titles[i] || `第${pageNo}章`);
    items.push(
      `<p id="p${pageNo}"><a href="/r/${encNs}/cont/${encSid}?p=${pageNo}&theme=${theme}">${title}</a></p>`,
    );
  }
  const catalogHtml = items.join('\n');

  return htmlResponse(
    render(catalogTemplate, {
      NAMESPACE: namespace,
      STORY_ID: storyId,
      ENC_NAMESPACE: encNs,
      ENC_STORY_ID: encSid,
      STORY_NAME: story.storyName,
      STORY_CATALOG: catalogHtml,
      CURRENT_PAGE: currentPage,
      TOTAL_PAGES: totalPages,
      PREV_PAGE: prev,
      NEXT_PAGE: next,
      FIRST_DISABLED: disabledTop,
      PREV_DISABLED: disabledTop,
      NEXT_DISABLED: disabledBottom,
      LAST_DISABLED: disabledBottom,
      FIRST_ARIA_DISABLED: String(currentPage === 1),
      PREV_ARIA_DISABLED: String(currentPage === 1),
      NEXT_ARIA_DISABLED: String(currentPage === totalPages),
      LAST_ARIA_DISABLED: String(currentPage === totalPages),
      FIRST_TABINDEX: currentPage === 1 ? '-1' : '0',
      PREV_TABINDEX: currentPage === 1 ? '-1' : '0',
      NEXT_TABINDEX: currentPage === totalPages ? '-1' : '0',
      LAST_TABINDEX: currentPage === totalPages ? '-1' : '0',
      THEME: theme,
      THEME_PRELOAD: getThemePreferenceScript(),
      THEME_STYLE: getThemeCSS(theme),
      THEME_OPTIONS: getThemeOptionsHTML(),
      THEME_SCRIPT: themeClient,
    }),
    { headers: { 'Cache-Control': 'public, max-age=60' } },
  );
};
