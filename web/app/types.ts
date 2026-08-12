export type Lang = "en" | "zh";
export type Tab = "home" | "shop" | "collection" | "cart" | "account";
export type ProductKind = "drink" | "goods";
export type ProductTagTone = "red" | "yellow" | "black" | "green";

export type ProductTag = {
  id: string;
  label: string;
  tone: ProductTagTone;
  createdAt: string;
};

export type Product = {
  id: string;
  apiId?: string;
  kind: ProductKind;
  category: string;
  name: string;
  nameZh: string;
  description: string;
  descriptionZh: string;
  price: number;
  sizePrices?: Record<string, number>;
  image: string;
  imageKey?: string;
  badge?: string;
  badgeTone?: ProductTagTone;
  tagId?: string;
  active?: boolean;
  discountPercent?: number;
  updatedAt?: string;
  catalogVersion?: number;
};

export type Store = {
  id: string;
  apiId?: string;
  name: string;
  area: string;
  address: string;
  phone: string;
  lat?: number;
  lng?: number;
  verified: boolean;
};

export type CartItem = {
  key: string;
  productId: string;
  quantity: number;
  size?: string;
  sugar?: string;
  ice?: string;
  toppings?: string[];
  productName?: string;
  productNameZh?: string;
  productImage?: string;
  unitPrice?: number;
  lineTotal?: number;
};

export type Order = {
  id: string;
  fulfillmentId?: string;
  createdAt: string;
  status:
    | "Placed"
    | "Confirmed"
    | "Preparing"
    | "Ready"
    | "Completed"
    | "Cancelled";
  channel: "Pickup" | "Delivery" | "Shipping";
  storeId: string;
  subtotal?: number;
  discount?: number;
  deliveryFee?: number;
  couponCode?: string;
  total: number;
  items: CartItem[];
  pickupCode: string;
  pickupCanReissue?: boolean;
  pickupExpiresAt?: string;
  pickupFingerprint?: string;
  addressId?: string;
  addressSnapshot?: Address;
  storeSnapshot?: Store;
};

export type CouponDiscountType = "PERCENT" | "FIXED" | "FREE_SIZE_UPGRADE";
export type CouponScopeType = "ALL" | "DRINKS" | "GOODS" | "CATEGORY" | "PRODUCT";
export type CouponStatus = "DRAFT" | "SCHEDULED" | "ACTIVE" | "PAUSED" | "ENDED" | "ARCHIVED";

export type Coupon = {
  id: string;
  code: string;
  nameEn: string;
  nameZh: string;
  descriptionEn: string;
  descriptionZh: string;
  discountType: CouponDiscountType;
  discountValue: number;
  maxDiscount: number | null;
  minSpend: number;
  scopeType: CouponScopeType;
  scopeValue: string | null;
  fulfillmentScope: "ALL" | "PICKUP" | "DELIVERY" | "SHIPPING";
  issuanceMode: "PUBLIC_CODE" | "ASSIGNED";
  startsAt: string;
  endsAt: string;
  issuanceLimit: number | null;
  usageLimit: number | null;
  perUserLimit: number;
  stackable: boolean;
};

export type UserCoupon = Coupon & {
  userCouponId: string;
  source: string;
  walletStatus: "AVAILABLE" | "UPCOMING" | "RESERVED" | "USED" | "EXPIRED" | "REVOKED" | "UNAVAILABLE";
  issuedAt: string;
  expiresAt: string;
  redeemedAt: string | null;
};

export type AuthProvider = "password" | "google" | "facebook";

export type AuthSession = {
  id: string;
  email: string;
  provider: AuthProvider;
};

export type Address = {
  id: string;
  label: string;
  recipient: string;
  phone: string;
  area: string;
  line1: string;
  instructions?: string;
  isDefault: boolean;
};

export type UserProfile = {
  nickname: string;
  gender: "Female" | "Male" | "Non-binary" | "Prefer not to say" | "";
  age: string;
  addresses: Address[];
};
