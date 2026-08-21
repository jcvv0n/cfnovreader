// /_cfnov_admin 入口：GET 返回管理 UI；POST /api/* 走 JSON API。

import adminHtml from './assets/admin.html';
import adminCss from './assets/admin.css';
import adminJs from './assets/admin.client.js';
import { render } from '../../render';
import { badRequest, htmlResponse, jsonError, textResponse, HttpError } from '../../http';
import { requireAdmin } from './auth';
import {
  createStoryAPI,
  deleteStoryAPI,
  listStoriesAPI,
  MAX_UPLOAD_BYTES,
  uploadStoryAPI,
} from './api';
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

    const contentLength = Number(request.headers.get('content-length'));
    if (Number.isFinite(contentLength) && contentLength > MAX_UPLOAD_BYTES + 64 * 1024) {
      throw badRequest('请求体不能超过 5 MB');
    }

    let body: Record<string, unknown>;
    let parsed: unknown;
    try {
      parsed = await request.json();
    } catch {
      throw badRequest('Invalid JSON body');
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw badRequest('JSON body 必须是对象');
    }
    body = parsed as Record<string, unknown>;

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
    // HttpError → 对应状态码；其余异常 → 500 固定文案，不泄漏内部细节。
    if (err instanceof HttpError) return jsonError(err.message, err.status);
    return jsonError('Internal Error', 500);
  }
}
