"use client";

import { useEffect, useState } from "react";
import { products as seedProducts } from "./data";
import type { Product } from "./types";

export const CATALOG_STORAGE_KEY = "kiyoyo-catalog";

export const salePrice = (product: Product) => {
  const discount = Math.max(0, Math.min(90, product.discountPercent || 0));
  return Math.round(product.price * (1 - discount / 100));
};

export function useCatalog() {
  const [catalog, setCatalog] = useState<Product[]>(seedProducts);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CATALOG_STORAGE_KEY);
      // Hydrate the local MVP catalog after server rendering.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (stored) setCatalog(JSON.parse(stored));
    } catch { /* keep seeded catalog */ }
    // Prevent the seeded server-render value from overwriting a saved catalog.
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(CATALOG_STORAGE_KEY, JSON.stringify(catalog)); } catch { /* local demo storage may be full */ }
  }, [catalog, ready]);

  useEffect(() => {
    const syncAcrossTabs = (event: StorageEvent) => {
      if (event.key !== CATALOG_STORAGE_KEY || !event.newValue) return;
      try { setCatalog(JSON.parse(event.newValue)); } catch { /* ignore invalid external value */ }
    };
    window.addEventListener("storage", syncAcrossTabs);
    return () => window.removeEventListener("storage", syncAcrossTabs);
  }, []);

  return [catalog, setCatalog] as const;
}
