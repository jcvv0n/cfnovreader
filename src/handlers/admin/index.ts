// /_cfnov_admin 入口：GET 返回管理 UI；POST /api/* 走 JSON API。

import adminHtml from './assets/admin.html';
import adminCss from './assets/admin.css';
import adminJs from './assets/admin.client.js';
import { render } from '../../render';
import { badRequest, htmlResponse, jsonError, textResponse, toErrorResponse } from '../../http';
import { requireAdmin } from './auth';
import { createStoryAPI, deleteStoryAPI, listStoriesAPI, uploadStoryAPI } from './api';
import type { Env } from '../../types';

const ADMIN_BASE = '/_cfnov_admin';

// 渲染一次即可（资源都是静态字符串）
const RENDERED_HTML = render(adminHtml, { ADMIN_CSS: adminCss, ADMIN_JS: adminJs });

export async function handleAdmin(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const subPath = url.pathname.slice(ADMIN_BASE.length) || '/';

  try {
    if (request.method === 'GET' && subPath === '/') {
      return htmlResponse(RENDERED_HTML);
    }

    if (request.method !== 'POST') {
      return textResponse('Method not allowed', 405);
    }

    requireAdmin(request, env);

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      throw badRequest('Invalid JSON body');
    }

    switch (subPath) {
      case '/api/stories':
        return await listStoriesAPI(body, env);
      case '/api/story/create':
        return await createStoryAPI(body, env);
      case '/api/story/delete':
        return await deleteStoryAPI(body, env);
      case '/api/story/upload':
        return await uploadStoryAPI(body, env);
      default:
        return jsonError('Not found', 404);
    }
  } catch (err) {
    // HttpError → 对应状态；其它异常 → 500。Admin API 习惯返回 {ok, error}，
    // 这里给 401/400 也回 JSON，保持前端解析一致。
    const resp = toErrorResponse(err);
    if (resp.headers.get('Content-Type')?.startsWith('text/plain')) {
      return jsonError(await resp.text(), resp.status);
    }
    return resp;
  }
}
