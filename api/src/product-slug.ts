import { randomUUID } from "node:crypto";

/**
 * 商品 slug:分类+名称派生 + uuid 后缀保证唯一。
 * admin 创建商品与银豹目录同步共用(server.ts 与 pospal/product-sync)。
 */
export const productSlug = (name: string, category: string) => {
  const stem = `${category}-${name}`
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
  return `${stem || "product"}-${randomUUID().slice(0, 8)}`;
};
