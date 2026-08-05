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
  kind: ProductKind;
  category: string;
  name: string;
  nameZh: string;
  description: string;
  descriptionZh: string;
  price: number;
  image: string;
  badge?: string;
  badgeTone?: ProductTagTone;
  tagId?: string;
  active?: boolean;
  discountPercent?: number;
  updatedAt?: string;
};

export type Store = {
  id: string;
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
};

export type Order = {
  id: string;
  createdAt: string;
  status: "Placed" | "Preparing" | "Ready" | "Completed";
  channel: "Pickup" | "Delivery" | "Shipping";
  storeId: string;
  total: number;
  items: CartItem[];
  pickupCode: string;
  addressId?: string;
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
