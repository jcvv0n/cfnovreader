import { describe, it, expect } from 'vitest';
import { matchRoute, type Route } from '../../src/router';

const routes: Route[] = [
  { pattern: /^\/r\/(?<namespace>[^/]+)\/stos\/(?<n>[^/]+)$/, handler: () => new Response('stories') },
  { pattern: /^\/r\/(?<namespace>[^/]+)\/cat\/(?<storyId>[^/]+)$/, handler: () => new Response('cat') },
  { pattern: /^\/r\/(?<namespace>[^/]+)\/cont\/(?<storyId>[^/]+)$/, handler: () => new Response('cont') },
];

describe('matchRoute', () => {
  it('stos 提取 namespace / n', () => {
    const m = matchRoute(routes, '/r/jcvv0n/stos/1');
    expect(m).not.toBeNull();
    expect(m!.params).toEqual({ namespace: 'jcvv0n', n: '1' });
  });

  it('cat / cont 提取 storyId', () => {
    expect(matchRoute(routes, '/r/jcvv0n/cat/103429903')!.params.storyId).toBe('103429903');
    expect(matchRoute(routes, '/r/jcvv0n/cont/103429903')!.params.storyId).toBe('103429903');
  });

  it('不匹配返回 null', () => {
    expect(matchRoute(routes, '/nope')).toBeNull();
    expect(matchRoute(routes, '/r/jcvv0n/stos/1/extra')).toBeNull();
  });

  it('只匹配整个 pathname', () => {
    // 末尾斜杠不匹配（与原正则一致）
    expect(matchRoute(routes, '/r/jcvv0n/stos/1/')).toBeNull();
  });

  it('解码 URL 路径参数，支持编码后的非 ASCII / 特殊字符', () => {
    const m = matchRoute(routes, '/r/%E6%B5%8B%E8%AF%95/cat/a%2Fb%3Fc');
    expect(m!.params).toEqual({ namespace: '测试', storyId: 'a/b?c' });
  });

  it('非法百分号编码不匹配路由', () => {
    expect(matchRoute(routes, '/r/%E0%A4/cat/id')).toBeNull();
  });
});
