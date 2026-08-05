"use client";

import { initializeApp, getApps } from "firebase/app";
import {
  FacebookAuthProvider,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import type { Product, ProductTag, ProductTagTone, Store } from "./types";

export const API_BASE_URL = "https://kiyoyo-dev-api-kwlb74l7uq-ew.a.run.app";
export const MAPS_BROWSER_KEY = "AIzaSyAyhLUiDn0yl-RLfhanindAsJGsQrhfsrg";

const firebaseConfig = {
  projectId: "kiyoyo",
  appId: "1:386290495601:web:47a307bc4965ddca752bd0",
  storageBucket: "kiyoyo.firebasestorage.app",
  apiKey: "AIzaSyCpM9bXRBrObsN4u5_cUq0kragkI0fCdNI",
  authDomain: "kiyoyo.firebaseapp.com",
  messagingSenderId: "386290495601",
};

const firebaseApp = getApps()[0] ?? initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);

export type SignInKind = "password" | "google" | "facebook";

export async function signInMember(
  kind: SignInKind,
  mode: "signin" | "signup",
  email = "",
  password = "",
) {
  if (kind === "google")
    return (await signInWithPopup(auth, new GoogleAuthProvider())).user;
  if (kind === "facebook")
    return (await signInWithPopup(auth, new FacebookAuthProvider())).user;
  return mode === "signup"
    ? (await createUserWithEmailAndPassword(auth, email, password)).user
    : (await signInWithEmailAndPassword(auth, email, password)).user;
}

export const observeMember = (listener: (user: User | null) => void) =>
  onAuthStateChanged(auth, listener);
export const signOutMember = () => signOut(auth);

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
  image_key: string;
  base_price: number;
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
const tone = (value: ApiProduct["tag_tone"]): ProductTagTone | undefined =>
  value?.toLowerCase() as ProductTagTone | undefined;

export function mapApiProduct(product: ApiProduct): Product {
  const image = product.image_key.startsWith("gcs://")
    ? `${API_BASE_URL}/v1/media/${btoa(product.image_key.split("/").slice(3).join("/")).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "")}`
    : product.image_key;
  return {
    id: product.external_code ?? product.id,
    apiId: product.id,
    kind: product.kind.toLowerCase() as Product["kind"],
    category: titleCase(product.category_slug),
    name: product.name_en,
    nameZh: product.name_zh,
    description: product.description_en,
    descriptionZh: product.description_zh,
    price: product.base_price,
    image,
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
    "/v1/products?include_inactive=true",
    {},
    false,
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
