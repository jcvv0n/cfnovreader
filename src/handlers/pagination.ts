// 目录页分页常量与 helper。
// pageSize 是目录页一页显示几个章节链接。

export const CATALOG_PAGE_SIZE = 10;

export function totalCatalogPages(count: number): number {
  if (count <= 0) return 1;
  return Math.ceil(count / CATALOG_PAGE_SIZE);
}
