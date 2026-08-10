import type { Address, Lang, Product, UserCoupon, UserProfile } from "../../types";

export const drinkCategoryAnchor = (category: string) =>
  category.toLowerCase().replace(/[^a-z0-9]+/g, "-");

export const categorySlug = (category: string) =>
  category
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export const couponStatusLabel = (status: UserCoupon["walletStatus"], lang: Lang) => {
  const labels: Record<UserCoupon["walletStatus"], [string, string]> = {
    AVAILABLE: ["Available", "可用"],
    UPCOMING: ["Upcoming", "待生效"],
    RESERVED: ["Reserved", "已锁定"],
    USED: ["Used", "已使用"],
    EXPIRED: ["Expired", "已过期"],
    REVOKED: ["Revoked", "已撤销"],
    UNAVAILABLE: ["Unavailable", "暂停使用"],
  };
  return labels[status][lang === "zh" ? 1 : 0];
};

export const drinkMenuTagRank = (product: Product) => {
  const label = product.badge?.trim().toLowerCase();
  if (label === "recommended" || label === "推荐") return 0;
  return label ? 1 : 2;
};

export const emptyProfile: UserProfile = {
  nickname: "",
  gender: "",
  age: "",
  addresses: [],
};

export const emptyAddress: Address = {
  id: "",
  label: "Home",
  recipient: "",
  phone: "",
  area: "",
  line1: "",
  instructions: "",
  isDefault: false,
};
