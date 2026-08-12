"use client";

import type {
  Address,
  Coupon,
  Order,
  Product,
  ProductTag,
  ProductTagTone,
  Store,
  UserCoupon,
} from "./types";
import { mediaUrlFromBucketPath } from "./media";
import { auth } from "./auth/firebase";

const deploymentEnvironment = process.env.NEXT_PUBLIC_KIYOYO_ENV ?? "dev";
const devFallback = deploymentEnvironment === "dev";

const publicConfigValue = (
  name: string,
  configured: string | undefined,
  developmentDefault: string,
) => {
  const value = configured ?? (devFallback ? developmentDefault : undefined);
  if (!value) {
    throw new Error(
      `Missing ${name} for the ${deploymentEnvironment} web build`,
    );
  }
  return value;
};

export const API_BASE_URL = publicConfigValue(
  "NEXT_PUBLIC_API_BASE_URL",
  process.env.NEXT_PUBLIC_API_BASE_URL,
  "https://kiyoyo-dev-api-kwlb74l7uq-ew.a.run.app",
);
export const MAPS_BROWSER_KEY = publicConfigValue(
  "NEXT_PUBLIC_MAPS_BROWSER_KEY",
  process.env.NEXT_PUBLIC_MAPS_BROWSER_KEY,
  "AIzaSyAyhLUiDn0yl-RLfhanindAsJGsQrhfsrg",
);

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
  requireAuth = true,
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body) headers.set("Content-Type", "application/json");
  if (requireAuth) {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error("Sign in required");
    headers.set("Authorization", `Bearer ${token}`);
  }
  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  if (response.status === 204) return undefined as T;
  const payload = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(
      payload?.error?.message ?? `Request failed (${response.status})`,
    );
  return payload as T;
}

type ApiProduct = {
  id: string;
  external_code: string | null;
  kind: "DRINK" | "GOODS";
  category_slug: string;
  slug: string;
  name_en: string;
  name_zh: string;
  description_en: string;
  description_zh: string;
  image_key: string | null;
  base_price: number;
  size_prices_json: Record<string, number>;
  discount_percent: number;
  active: boolean;
  catalog_version: number;
  updated_at: string;
  tag_id: string | null;
  tag_label: string | null;
  tag_tone: "RED" | "YELLOW" | "BLACK" | "GREEN" | null;
};

const titleCase = (value: string) =>
  value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
const drinkCategoryLabels: Record<string, string> = {
  "milk-tea": "Milk Tea",
  "fruit-tea": "Fruit Tea",
  "jelly-tea": "Jelly Tea",
  coffee: "Coffee",
  shake: "Shake",
  sundae: "Sundae",
  "cheese-smoothie": "Cheese Smoothie",
  souffle: "Soufflé",
  "add-ons": "Add-ons",
};
const tone = (value: ApiProduct["tag_tone"]): ProductTagTone | undefined =>
  value?.toLowerCase() as ProductTagTone | undefined;

export function mapApiProduct(product: ApiProduct): Product {
  const image = mediaUrlFromBucketPath(product.image_key, API_BASE_URL);
  return {
    id: product.external_code ?? product.id,
    apiId: product.id,
    kind: product.kind.toLowerCase() as Product["kind"],
    category:
      product.kind === "DRINK"
        ? (drinkCategoryLabels[product.category_slug] ??
          titleCase(product.category_slug))
        : titleCase(product.category_slug),
    name: product.name_en,
    nameZh: product.name_zh,
    description: product.description_en,
    descriptionZh: product.description_zh,
    price: product.base_price,
    sizePrices: product.size_prices_json,
    image,
    imageKey: product.image_key ?? undefined,
    badge: product.tag_label ?? undefined,
    badgeTone: tone(product.tag_tone),
    tagId: product.tag_id ?? undefined,
    active: product.active,
    discountPercent: product.discount_percent,
    catalogVersion: product.catalog_version,
    updatedAt: product.updated_at,
  };
}

export async function fetchCatalog() {
  const payload = await apiFetch<{ data: ApiProduct[] }>(
    "/v1/products",
    {},
    false,
  );
  return payload.data.map(mapApiProduct);
}

export async function fetchAdminCatalog() {
  const payload = await apiFetch<{ data: ApiProduct[] }>(
    "/v1/admin/products",
  );
  return payload.data.map(mapApiProduct);
}

export async function fetchProductTags(): Promise<ProductTag[]> {
  const products = await fetchCatalog();
  const tags = new Map<string, ProductTag>();
  for (const product of products) {
    if (product.tagId && product.badge && product.badgeTone) {
      tags.set(product.tagId, {
        id: product.tagId,
        label: product.badge,
        tone: product.badgeTone,
        createdAt: product.updatedAt ?? new Date(0).toISOString(),
      });
    }
  }
  return [...tags.values()];
}

type ApiStore = {
  id: string;
  code: string;
  name: string;
  area: string;
  address: string;
  phone: string | null;
  lat: number | null;
  lng: number | null;
  location_verified: boolean;
};

export async function fetchStores(): Promise<Store[]> {
  const payload = await apiFetch<{ data: ApiStore[] }>("/v1/stores", {}, false);
  return payload.data.map((store) => ({
    id: store.code,
    apiId: store.id,
    name: store.name,
    area: store.area,
    address: store.address,
    phone: store.phone ?? "—",
    lat: store.lat ?? undefined,
    lng: store.lng ?? undefined,
    verified: store.location_verified,
  }));
}

type ApiOrderItem = {
  id: string;
  product_id: string | null;
  product_code: string | null;
  name: string;
  name_zh: string | null;
  quantity: number;
  unit_price: number;
  line_total: number;
  customization: Record<string, unknown> | null;
  image_key: string | null;
};

type ApiOrderStore = {
  id: string;
  code: string;
  name: string;
  area: string;
  address: string;
  phone: string | null;
  lat: number | null;
  lng: number | null;
  location_verified: boolean;
};

type ApiOrderAddress = {
  id?: string;
  label?: string;
  contact_name?: string;
  phone_e164?: string;
  line1?: string;
  area?: string;
  delivery_instructions?: string;
  is_default?: boolean;
};

type ApiOrderFulfillment = {
  id: string;
  type: "PICKUP" | "DELIVERY" | "SHIPPING";
  status: "PLACED" | "CONFIRMED" | "PREPARING" | "READY" | "COMPLETED" | "CANCELLED";
  store_id: string | null;
  address_id: string | null;
  store: ApiOrderStore | null;
  address: ApiOrderAddress | null;
  items: ApiOrderItem[];
  pickup: {
    expires_at: string;
    redeemed_at: string | null;
    token_fingerprint: string;
    can_reissue: boolean;
  } | null;
};

type ApiMemberOrder = {
  order_number: string;
  coupon_code: string | null;
  subtotal: number;
  discount: number;
  delivery_fee: number;
  total: number;
  created_at: string;
  fulfillments: ApiOrderFulfillment[];
};

const orderStatus: Record<ApiOrderFulfillment["status"], Order["status"]> = {
  PLACED: "Placed",
  CONFIRMED: "Confirmed",
  PREPARING: "Preparing",
  READY: "Ready",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const orderChannel: Record<ApiOrderFulfillment["type"], Order["channel"]> = {
  PICKUP: "Pickup",
  DELIVERY: "Delivery",
  SHIPPING: "Shipping",
};

const mediaUrl = (imageKey: string | null) => {
  return mediaUrlFromBucketPath(imageKey, API_BASE_URL) || undefined;
};

const mapOrderAddress = (
  address: ApiOrderAddress | null,
): Address | undefined =>
  address
    ? {
        id: address.id ?? "",
        label: address.label ?? "Delivery",
        recipient: address.contact_name ?? "",
        phone: address.phone_e164 ?? "",
        area: address.area ?? "Nairobi",
        line1: address.line1 ?? "",
        instructions: address.delivery_instructions,
        isDefault: address.is_default ?? false,
      }
    : undefined;

export async function fetchMemberOrders(): Promise<Order[]> {
  const payload = await apiFetch<{ data: ApiMemberOrder[] }>("/v1/me/orders");
  return payload.data.flatMap((order) => {
    const fulfillment = order.fulfillments[0];
    if (!fulfillment) return [];
    const store: Store | undefined = fulfillment.store
      ? {
          id: fulfillment.store.code,
          apiId: fulfillment.store.id,
          name: fulfillment.store.name,
          area: fulfillment.store.area,
          address: fulfillment.store.address,
          phone: fulfillment.store.phone ?? "—",
          lat: fulfillment.store.lat ?? undefined,
          lng: fulfillment.store.lng ?? undefined,
          verified: fulfillment.store.location_verified,
        }
      : undefined;
    return [
      {
        id: order.order_number,
        fulfillmentId: fulfillment.id,
        createdAt: order.created_at,
        status: orderStatus[fulfillment.status],
        channel: orderChannel[fulfillment.type],
        storeId: store?.id ?? fulfillment.store_id ?? "",
        subtotal: order.subtotal,
        discount: order.discount,
        deliveryFee: order.delivery_fee,
        couponCode: order.coupon_code ?? undefined,
        total: order.total,
        items: order.fulfillments.flatMap((group) =>
          group.items.map((item) => {
            const customization = item.customization ?? {};
            return {
              key: item.id,
              productId: item.product_code ?? item.product_id ?? item.id,
              quantity: item.quantity,
              size:
                typeof customization.size === "string"
                  ? customization.size
                  : undefined,
              sugar:
                typeof customization.sugar === "string"
                  ? customization.sugar
                  : undefined,
              ice:
                typeof customization.ice === "string"
                  ? customization.ice
                  : undefined,
              toppings: Array.isArray(customization.toppings)
                ? customization.toppings.filter(
                    (value): value is string => typeof value === "string",
                  )
                : [],
              productName: item.name,
              productNameZh: item.name_zh ?? item.name,
              productImage: mediaUrl(item.image_key),
              unitPrice: item.unit_price,
              lineTotal: item.line_total,
            };
          }),
        ),
        pickupCode: "NO-PICKUP",
        pickupCanReissue: fulfillment.pickup?.can_reissue ?? false,
        pickupExpiresAt: fulfillment.pickup?.expires_at,
        pickupFingerprint: fulfillment.pickup?.token_fingerprint,
        addressId: fulfillment.address_id ?? undefined,
        addressSnapshot: mapOrderAddress(fulfillment.address),
        storeSnapshot: store,
      },
    ];
  });
}

type ApiCoupon = {
  id: string;
  code: string;
  name_en: string;
  name_zh: string;
  description_en: string;
  description_zh: string;
  discount_type: Coupon["discountType"];
  discount_value: number;
  max_discount: number | null;
  min_spend: number;
  scope_type: Coupon["scopeType"];
  scope_value: string | null;
  fulfillment_scope: Coupon["fulfillmentScope"];
  issuance_mode: Coupon["issuanceMode"];
  starts_at: string;
  ends_at: string;
  issuance_limit: number | null;
  usage_limit: number | null;
  per_user_limit: number;
  stackable: boolean;
};

const mapCoupon = (coupon: ApiCoupon): Coupon => ({
  id: coupon.id,
  code: coupon.code,
  nameEn: coupon.name_en,
  nameZh: coupon.name_zh,
  descriptionEn: coupon.description_en,
  descriptionZh: coupon.description_zh,
  discountType: coupon.discount_type,
  discountValue: coupon.discount_value,
  maxDiscount: coupon.max_discount,
  minSpend: coupon.min_spend,
  scopeType: coupon.scope_type,
  scopeValue: coupon.scope_value,
  fulfillmentScope: coupon.fulfillment_scope,
  issuanceMode: coupon.issuance_mode,
  startsAt: coupon.starts_at,
  endsAt: coupon.ends_at,
  issuanceLimit: coupon.issuance_limit,
  usageLimit: coupon.usage_limit,
  perUserLimit: coupon.per_user_limit,
  stackable: coupon.stackable,
});

export async function fetchMemberCoupons(): Promise<UserCoupon[]> {
  const payload = await apiFetch<{
    data: Array<ApiCoupon & {
      user_coupon_id: string;
      source: string;
      wallet_status: UserCoupon["walletStatus"];
      issued_at: string;
      expires_at: string;
      redeemed_at: string | null;
    }>;
  }>("/v1/me/coupons");
  return payload.data.map((coupon) => ({
    ...mapCoupon(coupon),
    userCouponId: coupon.user_coupon_id,
    source: coupon.source,
    walletStatus: coupon.wallet_status,
    issuedAt: coupon.issued_at,
    expiresAt: coupon.expires_at,
    redeemedAt: coupon.redeemed_at,
  }));
}

export async function reissuePickupToken(orderNumber: string) {
  const payload = await apiFetch<{
    data: {
      pickup_qr_payload: string;
      token_fingerprint: string;
      expires_at: string;
    };
  }>(`/v1/me/orders/${encodeURIComponent(orderNumber)}/pickup-token`, {
    method: "POST",
  });
  return payload.data;
}

export async function pickupTokenFingerprint(token: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token),
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16);
}
