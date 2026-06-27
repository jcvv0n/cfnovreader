// Admin token 鉴权。
// 生产环境从 wrangler secret 注入；本地用 wrangler.toml [vars].ADMIN_TOKEN。

import type { Env } from '../../types';
import { unauthorized } from '../../http';

export function requireAdmin(request: Request, env: Env): void {
  const token = request.headers.get('X-Admin-Token') || '';
  if (!env.ADMIN_TOKEN || token !== env.ADMIN_TOKEN) {
    throw unauthorized('Token 认证失败');
  }
}
