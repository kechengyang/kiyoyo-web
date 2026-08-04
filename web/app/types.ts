export type Lang = "en" | "zh";
export type Tab = "home" | "shop" | "collection" | "cart" | "account";
export type ProductKind = "drink" | "goods";

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
};
