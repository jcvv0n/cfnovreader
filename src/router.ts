// 路由分发：每条路由是 [正则, handler]，handler 接收 (request, env, params)。
// 想加新页面就在路由表里 push 一条。

import type { Env } from './types';

export type RouteParams = Record<string, string>;
export type RouteHandler = (
  request: Request,
  env: Env,
  params: RouteParams,
) => Promise<Response> | Response;

export interface Route {
  /** path 必须匹配整个 pathname；用具名捕获组 (?<name>...) 提取参数 */
  pattern: RegExp;
  handler: RouteHandler;
}

export function matchRoute(
  routes: Route[],
  pathname: string,
): { handler: RouteHandler; params: RouteParams } | null {
  for (const r of routes) {
    const m = r.pattern.exec(pathname);
    if (m) {
      return { handler: r.handler, params: { ...(m.groups ?? {}) } };
    }
  }
  return null;
}
