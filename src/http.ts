// 公共 HTTP 响应 / 错误处理 helper。

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export const notFound = (msg = 'Not Found') => new HttpError(404, msg);
export const badRequest = (msg = 'Bad Request') => new HttpError(400, msg);
export const unauthorized = (msg = 'Unauthorized') => new HttpError(401, msg);

export function htmlResponse(html: string, init: ResponseInit = {}): Response {
  return new Response(html, {
    ...init,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      ...(init.headers || {}),
    },
  });
}

export function textResponse(text: string, status = 200): Response {
  return new Response(text, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const jsonOk = (data: object = {}) => jsonResponse({ ok: true, ...data });
export const jsonError = (error: string, status = 200) =>
  jsonResponse({ ok: false, error }, status);

/** 把抛出的 HttpError 或其它异常映射为响应；其它异常一律 500 并把消息透出（admin 可见，但不含堆栈）。 */
export function toErrorResponse(err: unknown): Response {
  if (err instanceof HttpError) return textResponse(err.message, err.status);
  const msg = err instanceof Error ? err.message : String(err);
  return textResponse(`Internal Error: ${msg}`, 500);
}

/** 解析 ?p= 翻页参数。失败抛 HttpError 让上层统一处理。 */
export function parsePageNo(input: string | null, fallback = 1): number {
  if (input === null || input === '') return fallback;
  const n = Number(input);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1) {
    throw badRequest('Invalid PageNo');
  }
  return n;
}

/** 必填字符串字段：admin API body 用。 */
export function requireStr(obj: Record<string, unknown>, key: string): string {
  const v = obj[key];
  if (typeof v !== 'string' || v.length === 0) throw badRequest(`缺少必填字段: ${key}`);
  return v;
}
