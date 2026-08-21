// /r/{namespace}/stos/{n} 处理：当前只支持 n=1（书单一页）。

import storiesTemplate from '../templates/stories.html';
import themeClient from '../templates/theme.client.js';
import { render, escapeHtml } from '../render';
import { htmlResponse, notFound } from '../http';
import { listStoriesOrNull, type StoryOverview } from '../storage';
import {
  getThemeCSS,
  getThemeOptionsHTML,
  getThemePreferenceScript,
  resolveTheme,
} from '../themes';
import type { RouteHandler } from '../router';

export const storiesHandler: RouteHandler = async (request, env, params) => {
  const url = new URL(request.url);
  const namespace = params.namespace!;
  const n = params.n!;
  if (n !== '1') throw notFound('Invalid Page');

  const stories = await listStoriesOrNull(env.NOV_KV, namespace);
  if (!stories) throw notFound('Invalid Page');

  const theme = resolveTheme(url.searchParams.get('theme'));
  const encNs = encodeURIComponent(namespace);
  const overview = stories
    .map((s: StoryOverview) => {
      const encSid = encodeURIComponent(s.storyId);
      const name = escapeHtml(s.storyName);
      return `<p id="s${encSid}"><a data-story-id="${escapeHtml(s.storyId)}" href="/r/${encNs}/cat/${encSid}?theme=${theme}">${name}</a></p>`;
    })
    .join('\n');

  return htmlResponse(
    render(storiesTemplate, {
      THEME: theme,
      THEME_PRELOAD: getThemePreferenceScript(),
      THEME_STYLE: getThemeCSS(theme),
      THEME_OPTIONS: getThemeOptionsHTML(),
      THEME_SCRIPT: themeClient,
      STORY_OVERVIEW: overview,
    }),
    { headers: { 'Cache-Control': 'public, max-age=60' } },
  );
};
