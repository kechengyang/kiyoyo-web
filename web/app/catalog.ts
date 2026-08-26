"use client";

import { useEffect, useState } from "react";
import { products as seedProducts } from "./data";
import type { Product, ProductTag } from "./types";
import { fetchCatalog, fetchProductTags } from "./platform";

export const CATALOG_STORAGE_KEY = "kiyoyo-catalog";
export const PRODUCT_TAGS_STORAGE_KEY = "kiyoyo-product-tags";

// API 目录必有 apiId(seed 目录没有);以银豹为源后新商品 imageKey 可为空,
// 不能用 gcs:// 前缀判目录来源
const isApiCatalog = (value: unknown): value is Product[] =>
  Array.isArray(value) &&
  value.every(
    (product) =>
      product &&
      typeof product === "object" &&
      typeof (product as Product).apiId === "string",
  );

export const defaultProductTags: ProductTag[] = [
  {
    id: "tag-new",
    label: "NEW",
    tone: "red",
    createdAt: "2026-08-05T00:00:00.000Z",
  },
  {
    id: "tag-hot",
    label: "HOT",
    tone: "yellow",
    createdAt: "2026-08-05T00:00:00.000Z",
  },
  {
    id: "tag-no1",
    label: "NO.1",
    tone: "black",
    createdAt: "2026-08-05T00:00:00.000Z",
  },
  {
    id: "tag-fresh",
    label: "FRESH",
    tone: "green",
    createdAt: "2026-08-05T00:00:00.000Z",
  },
  {
    id: "tag-chef",
    label: "CHEF PICK",
    tone: "red",
    createdAt: "2026-08-05T00:00:00.000Z",
  },
  {
    id: "tag-recommended",
    label: "RECOMMENDED",
    tone: "red",
    createdAt: "2026-08-09T00:00:00.000Z",
  },
];

export const resolveProductTag = (product: Product, tags: ProductTag[]) => {
  if (product.tagId) return tags.find((tag) => tag.id === product.tagId);
  if (product.badge)
    return tags.find(
      (tag) => tag.label.toLowerCase() === product.badge?.toLowerCase(),
    );
  return undefined;
};

export const salePrice = (product: Product, size?: string) => {
  const discount = Math.max(0, Math.min(90, product.discountPercent || 0));
  const selectedPrice = size
    ? (product.sizePrices?.[size] ?? product.price)
    : product.price;
  return Math.round(selectedPrice * (1 - discount / 100));
};

/** 银豹口味组加料合计(ADD ONS 等;attributeValue 为加价金额 KES) */
export const addOnsPrice = (product: Product, item: { addOns?: string[] }) =>
  (item.addOns ?? []).reduce((sum, uid) => {
    const taste = product.pospalTastes?.find((candidate) => candidate.uid === uid);
    return sum + (taste ? Math.round(Number(taste.attributeValue ?? 0)) : 0);
  }, 0);

export function useCatalog() {
  const [catalog, setCatalog] = useState<Product[]>(seedProducts);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CATALOG_STORAGE_KEY);
      // Hydrate a verified API catalog after server rendering.
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (isApiCatalog(parsed)) setCatalog(parsed);
        else localStorage.removeItem(CATALOG_STORAGE_KEY);
      }
    } catch {
      /* keep seeded catalog */
    }
    // Prevent the seeded server-render value from overwriting a saved catalog.
    setReady(true);
    fetchCatalog()
      .then(setCatalog)
      .catch(() => {
        /* retain offline seed catalog */
      });
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(CATALOG_STORAGE_KEY, JSON.stringify(catalog));
    } catch {
      /* local demo storage may be full */
    }
  }, [catalog, ready]);

  useEffect(() => {
    const syncAcrossTabs = (event: StorageEvent) => {
      if (event.key !== CATALOG_STORAGE_KEY || !event.newValue) return;
      try {
        const parsed: unknown = JSON.parse(event.newValue);
        if (isApiCatalog(parsed)) setCatalog(parsed);
      } catch {
        /* ignore invalid external value */
      }
    };
    window.addEventListener("storage", syncAcrossTabs);
    return () => window.removeEventListener("storage", syncAcrossTabs);
  }, []);

  return [catalog, setCatalog] as const;
}

export function useProductTags() {
  const [tags, setTags] = useState<ProductTag[]>(defaultProductTags);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(PRODUCT_TAGS_STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (stored) setTags(JSON.parse(stored));
    } catch {
      /* keep default tags */
    }
    setReady(true);
    fetchProductTags()
      .then(setTags)
      .catch(() => {
        /* retain offline tag set */
      });
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(PRODUCT_TAGS_STORAGE_KEY, JSON.stringify(tags));
    } catch {
      /* local demo storage may be full */
    }
  }, [ready, tags]);

  useEffect(() => {
    const syncAcrossTabs = (event: StorageEvent) => {
      if (event.key !== PRODUCT_TAGS_STORAGE_KEY || !event.newValue) return;
      try {
        setTags(JSON.parse(event.newValue));
      } catch {
        /* ignore invalid external value */
      }
    };
    window.addEventListener("storage", syncAcrossTabs);
    return () => window.removeEventListener("storage", syncAcrossTabs);
  }, []);

  return [tags, setTags] as const;
}
