export type CouponRow = {
  id: string;
  code: string;
  name_en: string;
  name_zh: string;
  description_en: string;
  description_zh: string;
  discount_type: "PERCENT" | "FIXED" | "FREE_SIZE_UPGRADE";
  discount_value: number;
  max_discount: number | null;
  min_spend: number;
  scope_type: "ALL" | "DRINKS" | "GOODS" | "CATEGORY" | "PRODUCT";
  scope_value: string | null;
  fulfillment_scope: "ALL" | "PICKUP" | "DELIVERY" | "SHIPPING";
  issuance_mode: "PUBLIC_CODE" | "ASSIGNED";
  starts_at: string;
  ends_at: string;
  issuance_limit: number | null;
  usage_limit: number | null;
  per_user_limit: number;
  status: string;
  issuance_enabled: boolean;
  redemption_enabled: boolean;
  stackable: boolean;
  version: number;
};

export type CouponPricedItem = {
  quantity: number;
  customization: Record<string, unknown>;
  product: any;
  unitPrice: number;
};

const couponMatchesItem = (coupon: CouponRow, item: CouponPricedItem) => {
  const { product } = item;
  if (coupon.scope_type === "ALL") return true;
  if (coupon.scope_type === "DRINKS") return product.kind === "DRINK";
  if (coupon.scope_type === "GOODS") return product.kind === "GOODS";
  if (coupon.scope_type === "CATEGORY") return product.category_slug === coupon.scope_value;
  return [product.id, product.external_code, product.slug].includes(coupon.scope_value);
};

export const calculateCouponDiscount = (coupon: CouponRow, items: CouponPricedItem[]) => {
  const eligibleItems = items.filter((item) => couponMatchesItem(coupon, item));
  const eligibleSubtotal = eligibleItems.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0,
  );
  if (!eligibleItems.length) return { discount: 0, eligibleSubtotal, error: "Coupon does not apply to these items" };
  if (eligibleSubtotal < coupon.min_spend) return { discount: 0, eligibleSubtotal, error: `Spend at least KSh ${coupon.min_spend} on eligible items` };

  let discount = 0;
  if (coupon.discount_type === "PERCENT") {
    discount = Math.round((eligibleSubtotal * coupon.discount_value) / 100);
  } else if (coupon.discount_type === "FIXED") {
    discount = coupon.discount_value;
  } else {
    discount = eligibleItems.reduce((largest, item) => {
      if (item.product.kind !== "DRINK") return largest;
      const selectedSize = typeof item.customization.size === "string" ? item.customization.size : "";
      const prices = Object.values(item.product.size_prices_json ?? {}).map(Number).filter(Number.isFinite);
      const selectedPrice = Number(item.product.size_prices_json?.[selectedSize]);
      if (!prices.length || !Number.isFinite(selectedPrice)) return largest;
      return Math.max(largest, selectedPrice - Math.min(...prices));
    }, 0);
  }
  if (coupon.max_discount != null) discount = Math.min(discount, coupon.max_discount);
  discount = Math.max(0, Math.min(discount, eligibleSubtotal));
  return {
    discount,
    eligibleSubtotal,
    error: discount > 0 ? null : "This coupon does not reduce the selected items",
  };
};

