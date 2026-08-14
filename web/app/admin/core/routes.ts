import type { AdminTab } from "./types";

export const adminTabPaths: Record<AdminTab, string> = {
  home: "/admin",
  orders: "/admin/orders",
  redeem: "/admin/redeem",
  customers: "/admin/customers",
  admin: "/admin/management",
  overview: "/admin/overview",
  products: "/admin/products",
  coupons: "/admin/coupons",
  stores: "/admin/stores",
  access: "/admin/access",
};

export const adminTabPath = (tab: AdminTab) => adminTabPaths[tab];

export const adminTabFromPath = (pathname: string): AdminTab | null => {
  const path = pathname.replace(/\/+$/, "") || "/";
  const match = (Object.entries(adminTabPaths) as Array<[AdminTab, string]>)
    .find(([, tabPath]) => tabPath === path);
  return match?.[0] ?? null;
};

export const adminRouteSections = [
  "orders",
  "redeem",
  "customers",
  "management",
  "overview",
  "products",
  "coupons",
  "stores",
  "access",
] as const;

export const adminTabFromSection = (section: string): AdminTab | null =>
  adminTabFromPath(`/admin/${section}`);
