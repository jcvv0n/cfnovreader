// cfnovreader Worker 入口。
// 路由分发统一在这里维护，handler 各自独立模块。

import type { Env } from './types';
import { matchRoute, type Route } from './router';
import { storiesHandler } from './handlers/stories';
import { catalogHandler } from './handlers/catalog';
import { readerHandler } from './handlers/reader';
import { handleAdmin } from './handlers/admin';
import { textResponse, toErrorResponse } from './http';

export type { Env } from './types';

const routes: Route[] = [
  { pattern: /^\/_cfnov_admin(?:\/.*)?$/, handler: (req, env) => handleAdmin(req, env) },
  { pattern: /^\/r\/(?<namespace>[^/]+)\/stos\/(?<n>[^/]+)$/, handler: storiesHandler },
  { pattern: /^\/r\/(?<namespace>[^/]+)\/cat\/(?<storyId>[^/]+)$/, handler: catalogHandler },
  { pattern: /^\/r\/(?<namespace>[^/]+)\/cont\/(?<storyId>[^/]+)$/, handler: readerHandler },
];

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const route = matchRoute(routes, url.pathname);
    if (!route) return textResponse('Not Found', 404);

    try {
      return await route.handler(request, env, route.params);
    } catch (err) {
      return toErrorResponse(err);
    }
  },
};
