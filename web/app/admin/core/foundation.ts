import type { AdminCoupon } from "./types";

export const goodsCategoryOrder = [
  "Fashion",
  "Accessories",
  "Home",
  "Outdoor",
  "Pets",
  "Beauty",
  "Collectibles",
  "Sport",
] as const;

export const categorySlug = (category: string) =>
  category
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export const inputDateTime = (value: string) => {
  if (!value) return "";
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((candidate) => candidate.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
};

export const nairobiDateTimeIso = (value: string) =>
  value ? new Date(`${value}:00+03:00`).toISOString() : "";

export const newCouponDraft = (): AdminCoupon => {
  const start = new Date();
  start.setMinutes(0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 30);
  return {
    id: "",
    code: "",
    name_en: "",
    name_zh: "",
    description_en: "",
    description_zh: "",
    discount_type: "PERCENT",
    discount_value: 10,
    max_discount: null,
    min_spend: 0,
    scope_type: "ALL",
    scope_value: null,
    fulfillment_scope: "ALL",
    issuance_mode: "ASSIGNED",
    starts_at: start.toISOString(),
    ends_at: end.toISOString(),
    issuance_limit: null,
    usage_limit: null,
    per_user_limit: 1,
    status: "DRAFT",
    effective_status: "DRAFT",
    issuance_enabled: false,
    redemption_enabled: false,
    stackable: false,
    version: 1,
    issued_count: 0,
    redeemed_count: 0,
    discount_total: 0,
    updated_at: start.toISOString(),
  };
};
