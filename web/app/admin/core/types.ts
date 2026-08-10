export type AdminTab =
  | "overview"
  | "orders"
  | "products"
  | "coupons"
  | "redeem"
  | "customers"
  | "stores";

export type AdminCustomer = {
  id: string;
  email: string | null;
  nickname: string;
  gender: string | null;
  birth_year: number | null;
  locale: string;
  status: "ACTIVE" | "SUSPENDED" | "DELETED";
  created_at: string;
  order_count: number;
  lifetime_value: number;
};

export type CustomerDetail = AdminCustomer & {
  addresses: Array<{
    id: string;
    label: string;
    contact_name: string;
    phone_e164: string;
    line1: string;
    area: string;
    city: string;
    is_default: boolean;
  }>;
  orders: Array<{
    order_number: string;
    total: number;
    payment_status: string;
    is_test: boolean;
    created_at: string;
  }>;
  coupons: Array<{
    user_coupon_id: string;
    coupon_id: string;
    code: string;
    name_en: string;
    name_zh: string;
    discount_type: "PERCENT" | "FIXED" | "FREE_SIZE_UPGRADE";
    discount_value: number;
    status: "ISSUED" | "RESERVED" | "REDEEMED" | "REVOKED";
    wallet_status: "AVAILABLE" | "UPCOMING" | "RESERVED" | "USED" | "EXPIRED" | "REVOKED" | "UNAVAILABLE";
    source: string;
    issued_at: string;
    expires_at: string;
    redeemed_at: string | null;
    revoked_at: string | null;
    revoke_reason: string | null;
  }>;
};

export type AdminCoupon = {
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
  status: "DRAFT" | "SCHEDULED" | "ACTIVE" | "PAUSED" | "ENDED" | "ARCHIVED";
  effective_status: "DRAFT" | "SCHEDULED" | "ACTIVE" | "PAUSED" | "ENDED" | "ARCHIVED";
  issuance_enabled: boolean;
  redemption_enabled: boolean;
  stackable: boolean;
  version: number;
  issued_count: number;
  redeemed_count: number;
  discount_total: number;
  updated_at: string;
};

export type AdminStore = {
  id: string;
  code: string;
  name: string;
  area: string;
  address: string;
  phone: string | null;
  lat: number | null;
  lng: number | null;
  status: "ACTIVE" | "INACTIVE" | "COMING_SOON";
  pickup_enabled: boolean;
  delivery_enabled: boolean;
  location_verified: boolean;
};

export type AdminState = "loading" | "anonymous" | "forbidden" | "ready" | "error";

export type QrDetector = {
  detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue?: string }>>;
};

export type QrDetectorConstructor = new (options: { formats: string[] }) => QrDetector;
