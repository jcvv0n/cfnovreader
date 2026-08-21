// Admin token 鉴权。
// 生产环境从 wrangler secret 注入；本地用 .dev.vars。

import type { Env } from '../../types';
import { unauthorized } from '../../http';

/** 常量时间字符串比较，降低时序攻击风险。 */
function timingSafeEqual(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a);
  const eb = new TextEncoder().encode(b);
  if (ea.length !== eb.length) return false;
  let diff = 0;
  for (let i = 0; i < ea.length; i++) {
    diff |= ea[i] ^ eb[i];
  }
  return diff === 0;
}

export function requireAdmin(request: Request, env: Env): void {
  const token = request.headers.get('X-Admin-Token') || '';
  if (!env.ADMIN_TOKEN) throw unauthorized('未配置管理 Token');
  if (!timingSafeEqual(token, env.ADMIN_TOKEN)) {
    throw unauthorized('Token 认证失败');
  }
}
