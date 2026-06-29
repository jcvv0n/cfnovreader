import { describe, it, expect } from 'vitest';
import { CATALOG_PAGE_SIZE, totalCatalogPages } from '../../src/handlers/pagination';

describe('pagination helpers', () => {
  it('CATALOG_PAGE_SIZE = 10', () => {
    expect(CATALOG_PAGE_SIZE).toBe(10);
  });

  it('totalCatalogPages 按 10/页分页，至少 1 页', () => {
    expect(totalCatalogPages(0)).toBe(1);
    expect(totalCatalogPages(1)).toBe(1);
    expect(totalCatalogPages(10)).toBe(1);
    expect(totalCatalogPages(11)).toBe(2);
    expect(totalCatalogPages(25)).toBe(3);
    expect(totalCatalogPages(1276)).toBe(128);
  });
});
