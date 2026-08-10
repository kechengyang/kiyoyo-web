"use client";
/* eslint-disable @next/next/no-img-element -- Tiny admin thumbnails do not need image optimization. */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { money } from "../data";
import { drinkCategoryOrder } from "../menu";
import {
  resolveProductTag,
  salePrice,
  useCatalog,
  useProductTags,
} from "../catalog";
import {
  apiFetch,
  auth,
  fetchCatalog,
  mapApiProduct,
  observeMember,
  sendMemberPasswordReset,
  sendMemberVerification,
  signInMember,
  signOutMember,
} from "../platform";
import type { Order, Product, ProductTagTone } from "../types";

type AdminTab =
  | "overview"
  | "orders"
  | "products"
  | "coupons"
  | "redeem"
  | "customers"
  | "stores";

type AdminCustomer = {
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

type CustomerDetail = AdminCustomer & {
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

type AdminCoupon = {
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

type AdminStore = {
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

type AdminState = "loading" | "anonymous" | "forbidden" | "ready" | "error";

type QrDetector = {
  detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue?: string }>>;
};

type QrDetectorConstructor = new (options: { formats: string[] }) => QrDetector;

const goodsCategoryOrder = [
  "Fashion",
  "Accessories",
  "Home",
  "Outdoor",
  "Pets",
  "Beauty",
  "Collectibles",
  "Sport",
] as const;

const categorySlug = (category: string) =>
  category
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const inputDateTime = (value: string) => {
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

const nairobiDateTimeIso = (value: string) =>
  value ? new Date(`${value}:00+03:00`).toISOString() : "";

const newCouponDraft = (): AdminCoupon => {
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

export default function AdminApp() {
  const [tab, setTab] = useState<AdminTab>("overview");
  const [catalog, setCatalog] = useCatalog();
  const [productTags, setProductTags] = useProductTags();
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [coupons, setCoupons] = useState<AdminCoupon[]>([]);
  const [adminStores, setAdminStores] = useState<AdminStore[]>([]);
  const [selectedCustomer, setSelectedCustomer] =
    useState<CustomerDetail | null>(null);
  const [editingStore, setEditingStore] = useState<AdminStore | null>(null);
  const [editingCoupon, setEditingCoupon] = useState<AdminCoupon | null>(null);
  const [couponError, setCouponError] = useState("");
  const [couponBusy, setCouponBusy] = useState(false);
  const [issueCouponId, setIssueCouponId] = useState("");
  const [adminState, setAdminState] = useState<AdminState>("loading");
  const [adminAuth, setAdminAuth] = useState({ email: "", password: "" });
  const [adminAuthError, setAdminAuthError] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [scan, setScan] = useState("");
  const [scanResult, setScanResult] = useState<{
    ok: boolean;
    message: string;
    order?: Order;
  } | null>(null);
  const [storeFilter, setStoreFilter] = useState("all");
  const [productSearch, setProductSearch] = useState("");
  const [productKind, setProductKind] = useState<"all" | "drink" | "goods">(
    "all",
  );
  const [productCategory, setProductCategory] = useState("all");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productError, setProductError] = useState("");
  const [showTagManager, setShowTagManager] = useState(false);
  const [newTag, setNewTag] = useState<{ label: string; tone: ProductTagTone }>(
    { label: "", tone: "red" },
  );
  const [tagError, setTagError] = useState("");
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [cloudStatus, setCloudStatus] = useState("Connecting to KIYOYO Cloud…");
  const [scannerActive, setScannerActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerStreamRef = useRef<MediaStream | null>(null);
  const couponDialogRef = useRef<HTMLElement>(null);
  const couponReturnFocusRef = useRef<HTMLElement | null>(null);
  const couponEditorOpen = Boolean(editingCoupon);

  useEffect(
    () =>
      observeMember(async (user) => {
        if (!user) {
          setAdminState("anonymous");
          setAdminEmail("");
          setOrders([]);
          setCustomers([]);
          setCoupons([]);
          setAdminStores([]);
          return;
        }
        setAdminState("loading");
        setAdminEmail(user.email ?? "");
        try {
          await apiFetch("/v1/auth/bootstrap", {
            method: "POST",
            body: JSON.stringify({
              nickname:
                user.displayName || user.email?.split("@")[0] || "Admin",
              locale: "en",
            }),
          });
          const [
            productPayload,
            tagPayload,
            orderPayload,
            customerPayload,
            couponPayload,
            storePayload,
          ] = await Promise.all([
            apiFetch<{ data: Parameters<typeof mapApiProduct>[0][] }>(
              "/v1/admin/products",
            ),
            apiFetch<{
              data: Array<{
                id: string;
                label: string;
                tone: "RED" | "YELLOW" | "BLACK" | "GREEN";
                created_at: string;
              }>;
            }>("/v1/admin/product-tags"),
            apiFetch<{
              data: Array<{
                order_number: string;
                created_at: string;
                status: string;
                type: string;
                fulfillment_id: string;
                store_code: string | null;
                total: number;
                items: Array<{
                  id: string;
                  product_id: string | null;
                  product_code: string | null;
                  quantity: number;
                  customization: Record<string, unknown>;
                }>;
              }>;
            }>("/v1/admin/orders"),
            apiFetch<{ data: AdminCustomer[] }>("/v1/admin/customers"),
            apiFetch<{ data: AdminCoupon[] }>("/v1/admin/coupons"),
            apiFetch<{ data: AdminStore[] }>("/v1/admin/stores"),
          ]);
          setCatalog(productPayload.data.map(mapApiProduct));
          setProductTags(
            tagPayload.data.map((tag) => ({
              id: tag.id,
              label: tag.label,
              tone: tag.tone.toLowerCase() as ProductTagTone,
              createdAt: tag.created_at,
            })),
          );
          const cloudOrders: Order[] = orderPayload.data.map((order) => ({
            id: order.order_number,
            fulfillmentId: order.fulfillment_id,
            createdAt: order.created_at,
            status:
              `${order.status.charAt(0)}${order.status.slice(1).toLowerCase()}` as Order["status"],
            channel:
              `${order.type.charAt(0)}${order.type.slice(1).toLowerCase()}` as Order["channel"],
            storeId: order.store_code ?? "delivery",
            total: order.total,
            pickupCode: "SERVER",
            items: order.items.map((item) => ({
              key: item.id,
              productId: item.product_code ?? item.product_id ?? "archived",
              quantity: item.quantity,
              size:
                typeof item.customization.size === "string"
                  ? item.customization.size
                  : undefined,
              sugar:
                typeof item.customization.sugar === "string"
                  ? item.customization.sugar
                  : undefined,
              ice:
                typeof item.customization.ice === "string"
                  ? item.customization.ice
                  : undefined,
              toppings: Array.isArray(item.customization.toppings)
                ? (item.customization.toppings as string[])
                : undefined,
            })),
          }));
          setOrders(cloudOrders);
          setCustomers(customerPayload.data);
          setCoupons(couponPayload.data);
          setAdminStores(storePayload.data);
          setCloudStatus(`Connected as ${user.email}`);
          setAdminState("ready");
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Cloud connection failed";
          setCloudStatus(message);
          setAdminAuthError(message);
          setAdminState(
            message.includes("Admin access") || message.includes("Verify your email")
              ? "forbidden"
              : "error",
          );
        }
      }),
    [setCatalog, setProductTags],
  );

  useEffect(
    () => () => {
      scannerStreamRef.current?.getTracks().forEach((track) => track.stop());
    },
    [],
  );

  useEffect(() => {
    if (!couponEditorOpen) return;
    couponReturnFocusRef.current = document.activeElement as HTMLElement | null;
    const dialog = couponDialogRef.current;
    if (!dialog) return;
    const focusable = () =>
      Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])',
        ),
      );
    requestAnimationFrame(() => focusable()[0]?.focus());
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setEditingCoupon(null);
        return;
      }
      if (event.key !== "Tab") return;
      const controls = focusable();
      if (!controls.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    dialog.addEventListener("keydown", handleKeyDown);
    return () => {
      dialog.removeEventListener("keydown", handleKeyDown);
      couponReturnFocusRef.current?.focus();
      couponReturnFocusRef.current = null;
    };
  }, [couponEditorOpen]);

  const signInAdmin = async () => {
    setAdminAuthError("");
    if (!adminAuth.email.includes("@") || adminAuth.password.length < 6) {
      setAdminAuthError("Enter your admin email and password.");
      return;
    }
    try {
      await signInMember(
        "password",
        "signin",
        adminAuth.email.trim(),
        adminAuth.password,
      );
    } catch (error) {
      setAdminAuthError(
        error instanceof Error ? error.message : "Admin sign-in failed",
      );
    }
  };

  const resetAdminPassword = async () => {
    const email = adminAuth.email.trim();
    setAdminAuthError("");
    if (!email.includes("@")) {
      setAdminAuthError("Enter your admin email first.");
      return;
    }
    try {
      await sendMemberPasswordReset(email);
      setAdminAuthError(
        "If this administrator account exists, a password reset email has been sent.",
      );
    } catch (error) {
      setAdminAuthError(
        error instanceof Error
          ? error.message
          : "Password reset email could not be sent",
      );
    }
  };

  const shown = useMemo(
    () =>
      orders.filter((o) => storeFilter === "all" || o.storeId === storeFilter),
    [orders, storeFilter],
  );
  const active = orders.filter((o) => o.status !== "Completed");
  const revenue = orders.reduce((sum, o) => sum + o.total, 0);
  const categoryOptions = useMemo(() => {
    const preferred =
      productKind === "drink"
        ? [...drinkCategoryOrder]
        : productKind === "goods"
          ? [...goodsCategoryOrder]
          : [...drinkCategoryOrder, ...goodsCategoryOrder];
    const catalogCategories = catalog
      .filter(
        (product) => productKind === "all" || product.kind === productKind,
      )
      .map((product) => product.category);
    return [...new Set([...preferred, ...catalogCategories])];
  }, [catalog, productKind]);
  const shownProducts = useMemo(
    () =>
      catalog.filter((product) => {
        const query = productSearch.trim().toLowerCase();
        return (
          (productKind === "all" || product.kind === productKind) &&
          (productCategory === "all" ||
            product.category === productCategory) &&
          (!query ||
            `${product.name} ${product.nameZh} ${product.category}`
              .toLowerCase()
              .includes(query))
        );
      }),
    [catalog, productCategory, productKind, productSearch],
  );

  const openCustomer = async (customer: AdminCustomer) => {
    setAdminAuthError("");
    setCouponError("");
    try {
      const response = await apiFetch<{ data: CustomerDetail }>(
        `/v1/admin/customers/${customer.id}`,
      );
      setSelectedCustomer({
        ...response.data,
        order_count: customer.order_count,
        lifetime_value: customer.lifetime_value,
      });
      setIssueCouponId((current) =>
        current && coupons.some((coupon) => coupon.id === current)
          ? current
          : (coupons.find(
              (coupon) =>
                coupon.issuance_mode === "ASSIGNED" &&
                coupon.issuance_enabled &&
                ["ACTIVE", "SCHEDULED"].includes(coupon.effective_status),
            )?.id ?? ""),
      );
    } catch (error) {
      setCloudStatus(
        error instanceof Error ? error.message : "Customer could not be loaded",
      );
    }
  };

  const saveCustomer = async () => {
    if (!selectedCustomer?.nickname.trim()) return;
    try {
      const response = await apiFetch<{
        data: Pick<AdminCustomer, "id" | "email" | "nickname" | "status">;
      }>(`/v1/admin/customers/${selectedCustomer.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          nickname: selectedCustomer.nickname.trim(),
          status: selectedCustomer.status,
        }),
      });
      setCustomers((current) =>
        current.map((customer) =>
          customer.id === selectedCustomer.id
            ? { ...customer, ...response.data }
            : customer,
        ),
      );
      setSelectedCustomer(null);
      setCloudStatus("Customer saved to Cloud SQL");
    } catch (error) {
      setCloudStatus(
        error instanceof Error ? error.message : "Customer could not be saved",
      );
    }
  };

  const refreshCoupons = async () => {
    const response = await apiFetch<{ data: AdminCoupon[] }>(
      "/v1/admin/coupons",
    );
    setCoupons(response.data);
    return response.data;
  };

  const couponPayload = (coupon: AdminCoupon) => ({
    code: coupon.code.trim().toUpperCase(),
    name_en: coupon.name_en.trim(),
    name_zh: coupon.name_zh.trim(),
    description_en: coupon.description_en.trim(),
    description_zh: coupon.description_zh.trim(),
    discount_type: coupon.discount_type,
    discount_value:
      coupon.discount_type === "FREE_SIZE_UPGRADE"
        ? 0
        : coupon.discount_value,
    max_discount: coupon.max_discount,
    min_spend: coupon.min_spend,
    scope_type: coupon.scope_type,
    scope_value: coupon.scope_value?.trim() || null,
    fulfillment_scope: coupon.fulfillment_scope,
    issuance_mode: coupon.issuance_mode,
    starts_at: new Date(coupon.starts_at).toISOString(),
    ends_at: new Date(coupon.ends_at).toISOString(),
    issuance_limit: coupon.issuance_limit,
    usage_limit: coupon.usage_limit,
    per_user_limit: coupon.per_user_limit,
    stackable: coupon.stackable,
  });

  const saveCoupon = async () => {
    if (!editingCoupon) return;
    setCouponError("");
    if (!editingCoupon.code.trim() || !editingCoupon.name_en.trim() || !editingCoupon.name_zh.trim()) {
      setCouponError("Code and both customer-facing names are required.");
      return;
    }
    setCouponBusy(true);
    try {
      await apiFetch(editingCoupon.id ? `/v1/admin/coupons/${editingCoupon.id}` : "/v1/admin/coupons", {
        method: editingCoupon.id ? "PATCH" : "POST",
        body: JSON.stringify({
          ...couponPayload(editingCoupon),
          ...(editingCoupon.id ? { version: editingCoupon.version } : {}),
        }),
      });
      await refreshCoupons();
      setEditingCoupon(null);
      setCloudStatus(editingCoupon.id ? "Coupon draft updated" : "Coupon draft created");
    } catch (error) {
      setCouponError(error instanceof Error ? error.message : "Coupon could not be saved");
    } finally {
      setCouponBusy(false);
    }
  };

  const runCouponAction = async (
    coupon: AdminCoupon,
    action: "publish" | "stop-distribution" | "disable" | "archive",
  ) => {
    const actionLabel = {
      publish: "publish this coupon to customers",
      "stop-distribution": "stop new distribution while keeping issued coupons usable",
      disable: "disable redemption for every customer",
      archive: "archive this coupon",
    }[action];
    if (!window.confirm(`Confirm: ${actionLabel}?`)) return;
    let body: Record<string, string> | undefined;
    if (action === "disable") {
      const reason = window.prompt("Reason for emergency disable:")?.trim();
      if (!reason) return;
      body = { reason };
    }
    setCouponBusy(true);
    setCouponError("");
    try {
      await apiFetch(`/v1/admin/coupons/${coupon.id}/${action}`, {
        method: "POST",
        body: body ? JSON.stringify(body) : undefined,
      });
      await refreshCoupons();
      setCloudStatus(`Coupon ${action.replaceAll("-", " ")} completed`);
    } catch (error) {
      setCouponError(error instanceof Error ? error.message : "Coupon action failed");
    } finally {
      setCouponBusy(false);
    }
  };

  const issueCoupon = async () => {
    if (!selectedCustomer || !issueCouponId) return;
    setCouponError("");
    setCouponBusy(true);
    try {
      await apiFetch(`/v1/admin/customers/${selectedCustomer.id}/coupons`, {
        method: "POST",
        body: JSON.stringify({ coupon_id: issueCouponId }),
      });
      await openCustomer(selectedCustomer);
      await refreshCoupons();
      setCloudStatus("Coupon issued to customer");
    } catch (error) {
      setCouponError(error instanceof Error ? error.message : "Coupon could not be issued");
    } finally {
      setCouponBusy(false);
    }
  };

  const revokeUserCoupon = async (userCouponId: string) => {
    if (!selectedCustomer) return;
    const reason = window.prompt("Reason for revoking this unused coupon:")?.trim();
    if (!reason) return;
    setCouponError("");
    setCouponBusy(true);
    try {
      await apiFetch(`/v1/admin/user-coupons/${userCouponId}/revoke`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
      await openCustomer(selectedCustomer);
      await refreshCoupons();
      setCloudStatus("Unused customer coupon revoked");
    } catch (error) {
      setCouponError(error instanceof Error ? error.message : "Coupon could not be revoked");
    } finally {
      setCouponBusy(false);
    }
  };

  const saveStore = async () => {
    if (!editingStore?.name.trim() || !editingStore.address.trim()) return;
    try {
      const response = await apiFetch<{ data: AdminStore }>(
        `/v1/admin/stores/${editingStore.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            name: editingStore.name.trim(),
            address: editingStore.address.trim(),
            phone: editingStore.phone?.trim() || null,
            lat: editingStore.lat,
            lng: editingStore.lng,
            status: editingStore.status,
            pickup_enabled: editingStore.pickup_enabled,
            delivery_enabled: editingStore.delivery_enabled,
            location_verified: editingStore.location_verified,
          }),
        },
      );
      setAdminStores((current) =>
        current.map((store) =>
          store.id === response.data.id ? response.data : store,
        ),
      );
      setEditingStore(null);
      setCloudStatus("Store saved to Cloud SQL");
    } catch (error) {
      setCloudStatus(
        error instanceof Error ? error.message : "Store could not be saved",
      );
    }
  };

  const stopScanner = () => {
    scannerStreamRef.current?.getTracks().forEach((track) => track.stop());
    scannerStreamRef.current = null;
    setScannerActive(false);
  };

  const startScanner = async () => {
    setScanResult(null);
    const Detector = (
      window as typeof window & { BarcodeDetector?: QrDetectorConstructor }
    ).BarcodeDetector;
    if (!Detector) {
      setScanResult({
        ok: false,
        message: "This browser cannot scan QR codes. Paste the token below.",
      });
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      scannerStreamRef.current = stream;
      setScannerActive(true);
      requestAnimationFrame(async () => {
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        const detector = new Detector({ formats: ["qr_code"] });
        const scanFrame = async () => {
          if (!scannerStreamRef.current || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            const token = codes[0]?.rawValue?.trim();
            if (token) {
              setScan(token);
              setScanResult({
                ok: true,
                message: "QR captured. Check the store, then press Verify.",
              });
              stopScanner();
              return;
            }
          } catch {
            // Keep scanning while the camera is warming up.
          }
          requestAnimationFrame(scanFrame);
        };
        requestAnimationFrame(scanFrame);
      });
    } catch {
      setScanResult({
        ok: false,
        message: "Camera access was unavailable. Paste the token below.",
      });
    }
  };
  const changeStatus = async (id: string, status: Order["status"]) => {
    const order = orders.find((item) => item.id === id);
    if (order?.fulfillmentId) {
      try {
        await apiFetch(
          `/v1/admin/fulfillments/${order.fulfillmentId}/transition`,
          {
            method: "POST",
            body: JSON.stringify({ to: status.toUpperCase() }),
          },
        );
      } catch (error) {
        setCloudStatus(
          error instanceof Error ? error.message : "Status update failed",
        );
        return;
      }
    }
    setOrders(
      orders.map((item) => (item.id === id ? { ...item, status } : item)),
    );
  };
  const toggleProduct = async (id: string) => {
    const product = catalog.find((item) => item.id === id);
    if (!product?.apiId || !product.catalogVersion) {
      setProductError("Refresh the cloud catalog before editing.");
      return;
    }
    try {
      await apiFetch(`/v1/admin/products/${product.apiId}`, {
        method: "PATCH",
        body: JSON.stringify({
          active: product.active === false,
          catalog_version: product.catalogVersion,
        }),
      });
      setCatalog(await fetchCatalog());
    } catch (error) {
      setProductError(
        error instanceof Error ? error.message : "Product could not be updated",
      );
    }
  };
  const openProductEditor = (product: Product) => {
    const existingTag = resolveProductTag(product, productTags);
    setEditingProduct({
      ...product,
      active: product.active !== false,
      tagId: existingTag?.id,
      badge: undefined,
    });
    setProductError("");
    setPendingImage(null);
  };
  const addTag = async () => {
    const label = newTag.label.trim().toUpperCase();
    if (!label) {
      setTagError("Enter a tag label.");
      return;
    }
    if (
      productTags.some((tag) => tag.label.toLowerCase() === label.toLowerCase())
    ) {
      setTagError("That tag already exists.");
      return;
    }
    try {
      const response = await apiFetch<{
        data: { id: string; label: string; tone: string; created_at: string };
      }>("/v1/admin/product-tags", {
        method: "POST",
        body: JSON.stringify({ label, tone: newTag.tone.toUpperCase() }),
      });
      setProductTags([
        ...productTags,
        {
          id: response.data.id,
          label: response.data.label,
          tone: response.data.tone.toLowerCase() as ProductTagTone,
          createdAt: response.data.created_at,
        },
      ]);
      setNewTag({ label: "", tone: "red" });
      setTagError("");
    } catch (error) {
      setTagError(
        error instanceof Error ? error.message : "Tag could not be created",
      );
    }
  };
  const deleteTag = async (id: string) => {
    try {
      await apiFetch(`/v1/admin/product-tags/${id}`, { method: "DELETE" });
      setProductTags(productTags.filter((tag) => tag.id !== id));
      setCatalog(await fetchCatalog());
    } catch (error) {
      setTagError(
        error instanceof Error ? error.message : "Tag could not be archived",
      );
    }
  };
  const saveProduct = async () => {
    if (
      !editingProduct ||
      !editingProduct.name.trim() ||
      !editingProduct.nameZh.trim() ||
      !editingProduct.category.trim() ||
      editingProduct.price <= 0
    ) {
      setProductError(
        "Choose a category, complete both names and enter a valid price.",
      );
      return;
    }
    if (!editingProduct.apiId || !editingProduct.catalogVersion) {
      setProductError("Refresh the cloud catalog before editing.");
      return;
    }
    try {
      const update = await apiFetch<{ data: { catalog_version: number } }>(
        `/v1/admin/products/${editingProduct.apiId}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            name_en: editingProduct.name,
            name_zh: editingProduct.nameZh,
            category_slug: categorySlug(editingProduct.category),
            base_price: editingProduct.price,
            discount_percent: Math.max(
              0,
              Math.min(90, Number(editingProduct.discountPercent) || 0),
            ),
            active: editingProduct.active !== false,
            tag_id: editingProduct.tagId ?? null,
            catalog_version: editingProduct.catalogVersion,
          }),
        },
      );
      if (pendingImage) {
        const upload = await apiFetch<{
          data: { upload_url: string; object_key: string };
        }>(`/v1/admin/products/${editingProduct.apiId}/media-upload`, {
          method: "POST",
          body: JSON.stringify({
            filename: pendingImage.name,
            content_type: pendingImage.type,
            bytes: pendingImage.size,
          }),
        });
        const uploaded = await fetch(upload.data.upload_url, {
          method: "PUT",
          headers: { "Content-Type": pendingImage.type },
          body: pendingImage,
        });
        if (!uploaded.ok) throw new Error("Image upload failed");
        await apiFetch(
          `/v1/admin/products/${editingProduct.apiId}/media-confirm`,
          {
            method: "POST",
            body: JSON.stringify({
              object_key: upload.data.object_key,
              catalog_version: update.data.catalog_version,
            }),
          },
        );
      }
      setCatalog(await fetchCatalog());
      setEditingProduct(null);
      setPendingImage(null);
      setProductError("");
    } catch (error) {
      setProductError(
        error instanceof Error ? error.message : "Product could not be saved",
      );
    }
  };
  const updateProductImage = (file?: File) => {
    if (!file || !editingProduct) return;
    if (!file.type.startsWith("image/")) {
      setProductError("Choose a JPG, PNG or WebP image.");
      return;
    }
    if (file.size > 1_500_000) {
      setProductError("Use an image under 1.5 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setPendingImage(file);
      setEditingProduct((current) =>
        current ? { ...current, image: String(reader.result) } : current,
      );
    };
    reader.onerror = () => setProductError("The image could not be read.");
    reader.readAsDataURL(file);
  };
  const redeem = async () => {
    const token = scan.trim();
    if (!token) {
      setScanResult({ ok: false, message: "Enter or scan a pickup token." });
      return;
    }
    if (storeFilter === "all") {
      setScanResult({
        ok: false,
        message: "Choose the pickup store before redeeming this QR code.",
      });
      return;
    }
    try {
      const response = await apiFetch<{
        data: { order_number: string; status: string };
      }>("/v1/admin/pickups/redeem", {
        method: "POST",
        headers: { "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({
          token,
          store_id: storeFilter,
        }),
      });
      setScanResult({
        ok: true,
        message: `${response.data.order_number} verified. Hand the order to the customer.`,
      });
    } catch (error) {
      setScanResult({
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Pickup could not be redeemed",
      });
    }
  };

  if (adminState !== "ready") {
    return (
      <main className="admin-gate">
        <section>
          <span className="logo">KIYOYO</span>
          <small>SECURE OPERATIONS</small>
          <h1>
            {adminState === "loading"
              ? "Checking access…"
              : adminState === "forbidden"
                ? "Admin access required"
                : adminState === "error"
                  ? "Cloud connection unavailable"
                  : "Sign in to Admin"}
          </h1>
          {adminState === "anonymous" ? (
            <>
              <p>
                Use a verified KIYOYO administrator account. Customer accounts
                cannot access operations data.
              </p>
              <label className="form-field">
                <span>Email</span>
                <input
                  type="email"
                  autoComplete="email"
                  value={adminAuth.email}
                  onChange={(event) =>
                    setAdminAuth({ ...adminAuth, email: event.target.value })
                  }
                />
              </label>
              <label className="form-field">
                <span>Password</span>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={adminAuth.password}
                  onChange={(event) =>
                    setAdminAuth({ ...adminAuth, password: event.target.value })
                  }
                  onKeyDown={(event) =>
                    event.key === "Enter" && void signInAdmin()
                  }
                />
              </label>
              <button className="primary full" onClick={() => void signInAdmin()}>
                Sign in securely →
              </button>
              <button
                className="admin-gate-secondary"
                onClick={() => void resetAdminPassword()}
              >
                Forgot password? Send reset email
              </button>
              <p className="admin-login-note">
                KIYOYO does not store or display administrator passwords. A
                real administrator account must use an inbox you control.
              </p>
            </>
          ) : adminState === "loading" ? (
            <p>Loading permissions and live Cloud SQL data.</p>
          ) : (
            <>
              <p>
                {adminAuthError ||
                  `${adminEmail || "This account"} is not an authorised administrator.`}
              </p>
              {auth.currentUser && !auth.currentUser.emailVerified && (
                <button
                  className="primary full"
                  onClick={async () => {
                    try {
                      await sendMemberVerification();
                      setAdminAuthError("Verification email sent.");
                    } catch (error) {
                      setAdminAuthError(
                        error instanceof Error
                          ? error.message
                          : "Verification email could not be sent",
                      );
                    }
                  }}
                >
                  Send verification email →
                </button>
              )}
              <button
                className="admin-gate-secondary"
                onClick={() => void signOutMember()}
              >
                Sign out and use another account
              </button>
            </>
          )}
          {adminAuthError && adminState === "anonymous" && (
            <div className="form-error">{adminAuthError}</div>
          )}
          <Link href="/">← Back to customer store</Link>
        </section>
      </main>
    );
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <span className="logo">KIYOYO</span>
          <small>OPERATIONS</small>
        </div>
        <nav>
          {(
            [
              "overview",
              "orders",
              "products",
              "coupons",
              "redeem",
              "customers",
              "stores",
            ] as AdminTab[]
          ).map((item) => (
            <button
              key={item}
              className={tab === item ? "active" : ""}
              onClick={() => setTab(item)}
            >
              <i>
                {
                  {
                    overview: "▦",
                    orders: "▤",
                    products: "◇",
                    coupons: "%",
                    redeem: "⌗",
                    customers: "☺",
                    stores: "⌖",
                  }[item]
                }
              </i>
              <span>{item}</span>
              {item === "orders" && <b>{active.length}</b>}
            </button>
          ))}
        </nav>
        <Link href="/">← Customer store</Link>
        <div className="admin-user">
          <i>{(adminEmail || "KI").slice(0, 2).toUpperCase()}</i>
          <span>
            <strong>{adminEmail}</strong>
            <small>Nairobi HQ</small>
          </span>
        </div>
      </aside>
      <main className="admin-main">
        <header className="admin-top">
          <div>
            <small>KIYOYO / NAIROBI</small>
            <h1>{tab}</h1>
          </div>
          <div>
            <span className="live-dot" /> {cloudStatus}{" "}
            <button onClick={() => void signOutMember()}>
              Sign out <b>{active.length}</b>
            </button>
          </div>
        </header>

        {tab === "overview" && (
          <>
            <section className="metric-grid">
              <Metric
                label="Recent orders"
                value={String(orders.length)}
                note={`${active.length} active now`}
                trend="LIVE"
              />
              <Metric
                label="Gross sales"
                value={money(revenue)}
                note="Mock payment value"
                trend="TEST"
              />
              <Metric
                label="Ready for pickup"
                value={String(
                  orders.filter((o) => o.status === "Ready").length,
                )}
                note="Needs attention"
                trend="LIVE"
              />
              <Metric
                label="Members"
                value={String(customers.length)}
                note="Loaded from Cloud SQL"
                trend="LIVE"
              />
            </section>
            <div className="admin-two">
              <section className="admin-panel">
                <PanelHead
                  title="Live orders"
                  action="View all"
                  onAction={() => setTab("orders")}
                />
                <OrderTable
                  orders={orders.slice(0, 5)}
                  catalog={catalog}
                  stores={adminStores}
                  onStatus={changeStatus}
                />
              </section>
              <section className="admin-panel store-pulse">
                <PanelHead title="Store pulse" />
                <div className="pulse-chart">
                  {adminStores.slice(0, 5).map((store) => {
                    const count = orders.filter(
                      (order) => order.storeId === store.code,
                    ).length;
                    const maximum = Math.max(
                      1,
                      ...adminStores.map(
                        (candidate) =>
                          orders.filter(
                            (order) => order.storeId === candidate.code,
                          ).length,
                      ),
                    );
                    return (
                      <div key={store.id}>
                        <span>{store.area}</span>
                        <i>
                          <b style={{ height: `${(count / maximum) * 100}%` }} />
                        </i>
                        <strong>{count}</strong>
                      </div>
                    );
                  })}
                </div>
                <small>Recent orders · live Cloud SQL data</small>
              </section>
            </div>
            <section className="admin-panel quick">
              <PanelHead title="Quick actions" />
              <div>
                <button onClick={() => setTab("products")}>
                  <i>◇</i>
                  <strong>Manage products</strong>
                  <span>Pricing, offers & images</span>
                </button>
                <button onClick={() => setTab("redeem")}>
                  <i>⌗</i>
                  <strong>Redeem pickup</strong>
                  <span>Verify one-time QR</span>
                </button>
                <button onClick={() => setTab("orders")}>
                  <i>▤</i>
                  <strong>Manage orders</strong>
                  <span>Update preparation status</span>
                </button>
              </div>
            </section>
          </>
        )}

        {tab === "orders" && (
          <section className="admin-panel wide">
            <div className="orders-tools">
              <PanelHead title="All orders" />
              <select
                value={storeFilter}
                onChange={(e) => setStoreFilter(e.target.value)}
              >
                <option value="all">All Nairobi stores</option>
                {adminStores.map((store) => (
                  <option key={store.id} value={store.code}>
                    {store.area}
                  </option>
                ))}
              </select>
            </div>
            <OrderTable
              orders={shown}
              catalog={catalog}
              stores={adminStores}
              onStatus={changeStatus}
            />
          </section>
        )}

        {tab === "products" && (
          <section className="admin-panel wide product-management">
            <div className="product-admin-head">
              <div>
                <span className="red-label">LIVE CATALOG</span>
                <h2>Product management</h2>
                <p>
                  Changes sync through the Commerce API to every storefront.
                </p>
              </div>
              <div className="catalog-stats">
                <span>
                  <b>{catalog.filter((p) => p.active !== false).length}</b> live
                </span>
                <span>
                  <b>{productTags.length}</b> tags
                </span>
                <button onClick={() => setShowTagManager(!showTagManager)}>
                  {showTagManager ? "Close tags" : "Manage tags"} →
                </button>
              </div>
            </div>
            {showTagManager && (
              <section className="tag-manager">
                <div>
                  <span className="red-label">TAG LIBRARY</span>
                  <h3>Create and define product tags</h3>
                  <p>
                    Tags are reusable. Assign one from each product’s edit
                    panel.
                  </p>
                </div>
                <div className="tag-creator">
                  <input
                    maxLength={18}
                    value={newTag.label}
                    onChange={(e) =>
                      setNewTag({ ...newTag, label: e.target.value })
                    }
                    onKeyDown={(e) => e.key === "Enter" && addTag()}
                    placeholder="e.g. DROP 01"
                  />
                  <select
                    value={newTag.tone}
                    onChange={(e) =>
                      setNewTag({
                        ...newTag,
                        tone: e.target.value as ProductTagTone,
                      })
                    }
                  >
                    <option value="red">KIYOYO red</option>
                    <option value="yellow">Highlight yellow</option>
                    <option value="black">Studio black</option>
                    <option value="green">Fresh green</option>
                  </select>
                  <span className="tag-chip" data-tone={newTag.tone}>
                    {newTag.label.trim().toUpperCase() || "PREVIEW"}
                  </span>
                  <button onClick={addTag}>+ Create tag</button>
                </div>
                {tagError && <div className="form-error">{tagError}</div>}
                <div className="tag-library">
                  {productTags.map((tag) => (
                    <span key={tag.id}>
                      <em className="tag-chip" data-tone={tag.tone}>
                        {tag.label}
                      </em>
                      <small>
                        {
                          catalog.filter(
                            (product) =>
                              product.tagId === tag.id ||
                              (!product.tagId &&
                                product.badge?.toLowerCase() ===
                                  tag.label.toLowerCase()),
                          ).length
                        }{" "}
                        products
                      </small>
                      <button
                        aria-label={`Delete ${tag.label}`}
                        onClick={() => deleteTag(tag.id)}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </section>
            )}
            <div className="product-admin-tools">
              <label>
                <span>⌕</span>
                <input
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Search products"
                />
              </label>
              <div>
                {(["all", "drink", "goods"] as const).map((kind) => (
                  <button
                    key={kind}
                    className={productKind === kind ? "active" : ""}
                    onClick={() => {
                      setProductKind(kind);
                      setProductCategory("all");
                    }}
                  >
                    {kind}
                  </button>
                ))}
                <select
                  aria-label="Filter products by category"
                  value={productCategory}
                  onChange={(event) => setProductCategory(event.target.value)}
                >
                  <option value="all">All categories</option>
                  {categoryOptions.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="admin-product-list">
              <div className="product-list-head">
                <span>Product</span>
                <span>Price</span>
                <span>Offer / tag</span>
                <span>Visibility</span>
                <span>Action</span>
              </div>
              {shownProducts.map((product) => {
                const assignedTag = resolveProductTag(product, productTags);
                return (
                  <article
                    key={product.id}
                    className={product.active === false ? "offline" : ""}
                  >
                    <span className="admin-product-name">
                      <img src={product.image} alt="" />
                      <span>
                        <strong>{product.name}</strong>
                        <small>
                          {product.nameZh} · {product.category}
                        </small>
                      </span>
                    </span>
                    <span className="admin-price">
                      <strong>{money(salePrice(product))}</strong>
                      {(product.discountPercent || 0) > 0 && (
                        <del>{money(product.price)}</del>
                      )}
                    </span>
                    <span>
                      {(product.discountPercent || 0) > 0 ? (
                        <em className="offer-pill">
                          −{product.discountPercent}%
                        </em>
                      ) : assignedTag ? (
                        <em className="tag-chip" data-tone={assignedTag.tone}>
                          {assignedTag.label}
                        </em>
                      ) : (
                        <small>—</small>
                      )}
                    </span>
                    <span>
                      <button
                        className={`publish-toggle ${product.active === false ? "off" : ""}`}
                        onClick={() => toggleProduct(product.id)}
                      >
                        <i />
                        {product.active === false ? "Offline" : "Live"}
                      </button>
                    </span>
                    <span>
                      <button
                        className="edit-product"
                        onClick={() => openProductEditor(product)}
                      >
                        Edit →
                      </button>
                    </span>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {tab === "coupons" && (
          <section className="admin-panel wide coupon-management">
            <div className="product-admin-head">
              <div>
                <span className="red-label">PROMOTIONS</span>
                <h2>Coupon management</h2>
                <p>Create rules, schedule publishing, stop distribution and review redemptions.</p>
              </div>
              <div className="catalog-stats">
                <span><b>{coupons.filter((coupon) => coupon.effective_status === "ACTIVE").length}</b> active</span>
                <span><b>{coupons.reduce((sum, coupon) => sum + coupon.redeemed_count, 0)}</b> used</span>
                <button onClick={() => {
                  setCouponError("");
                  setEditingCoupon(newCouponDraft());
                }}>+ Create coupon</button>
              </div>
            </div>
            {couponError && <div className="form-error" role="alert">{couponError}</div>}
            <div className="admin-coupon-list">
              <div className="coupon-list-head">
                <span>Coupon</span>
                <span>Offer</span>
                <span>Window</span>
                <span>Status</span>
                <span>Issued / used</span>
                <span>Actions</span>
              </div>
              {coupons.length ? coupons.map((coupon) => (
                <article key={coupon.id}>
                  <span className="admin-coupon-name">
                    <strong>{coupon.name_en}</strong>
                    <small>{coupon.code} · {coupon.issuance_mode === "ASSIGNED" ? "Member wallet" : "Public code"}</small>
                  </span>
                  <span>
                    <strong>
                      {coupon.discount_type === "PERCENT"
                        ? `${coupon.discount_value}% off`
                        : coupon.discount_type === "FIXED"
                          ? `${money(coupon.discount_value)} off`
                          : "Free size upgrade"}
                    </strong>
                    <small>{coupon.min_spend ? `Min. ${money(coupon.min_spend)}` : "No minimum"}</small>
                  </span>
                  <span>
                    <strong>{new Date(coupon.starts_at).toLocaleDateString("en-KE")}</strong>
                    <small>to {new Date(coupon.ends_at).toLocaleDateString("en-KE")}</small>
                  </span>
                  <span>
                    <em className="coupon-status" data-status={coupon.effective_status.toLowerCase()}>
                      {coupon.effective_status}
                    </em>
                    <small>{coupon.effective_status === "ENDED" ? "Window ended" : coupon.issuance_enabled ? "Distribution on" : "Distribution off"}</small>
                  </span>
                  <span>
                    <strong>{coupon.issued_count} / {coupon.redeemed_count}</strong>
                    <small>{money(coupon.discount_total)} discounted</small>
                  </span>
                  <span className="coupon-row-actions">
                    <button onClick={() => {
                      setCouponError("");
                      setEditingCoupon({ ...coupon });
                    }}>{coupon.redeemed_count ? "View rules" : "Edit"}</button>
                    {!coupon.redemption_enabled && coupon.effective_status !== "ARCHIVED" && coupon.effective_status !== "ENDED" && (
                      <button disabled={couponBusy} onClick={() => void runCouponAction(coupon, "publish")}>Publish</button>
                    )}
                    {coupon.redemption_enabled && !coupon.issuance_enabled && (
                      <button disabled={couponBusy} onClick={() => void runCouponAction(coupon, "publish")}>Resume</button>
                    )}
                    {coupon.issuance_enabled && ["ACTIVE", "SCHEDULED"].includes(coupon.effective_status) && (
                      <button disabled={couponBusy} onClick={() => void runCouponAction(coupon, "stop-distribution")}>Stop issuing</button>
                    )}
                    {coupon.redemption_enabled && ["ACTIVE", "SCHEDULED"].includes(coupon.effective_status) && (
                      <button className="danger-text" disabled={couponBusy} onClick={() => void runCouponAction(coupon, "disable")}>Disable use</button>
                    )}
                    {coupon.effective_status !== "ARCHIVED" && (!coupon.redemption_enabled || coupon.effective_status === "ENDED") && (
                      <button disabled={couponBusy} onClick={() => void runCouponAction(coupon, "archive")}>Archive</button>
                    )}
                  </span>
                </article>
              )) : (
                <div className="admin-empty-state">
                  <strong>No coupons yet</strong>
                  <span>Create a draft, review its customer preview, then publish it.</span>
                </div>
              )}
            </div>
          </section>
        )}

        {tab === "redeem" && (
          <div className="redeem-layout">
            <section className="redeem-card">
              <span className="red-label">ONE-TIME PICKUP</span>
              <h2>Scan or enter code</h2>
              <p>
                Scan the customer’s signed QR pickup token. A completed code
                cannot be used twice.
              </p>
              <label className="redeem-store-select">
                <span>Pickup store</span>
                <select
                  value={storeFilter}
                  onChange={(event) => setStoreFilter(event.target.value)}
                >
                  <option value="all">Choose store</option>
                  {adminStores
                    .filter((store) => store.pickup_enabled)
                    .map((store) => (
                      <option key={store.id} value={store.code}>
                        {store.name}
                      </option>
                    ))}
                </select>
              </label>
              <div className={`scanner-frame ${scannerActive ? "active" : ""}`}>
                {scannerActive ? (
                  <video ref={videoRef} muted playsInline aria-label="QR camera" />
                ) : (
                  <>
                    <div className="scanner-line" />
                    <span>⌗</span>
                    <small>Camera ready</small>
                  </>
                )}
              </div>
              <button
                className="camera-scan-button"
                onClick={() =>
                  scannerActive ? stopScanner() : void startScanner()
                }
              >
                {scannerActive ? "Stop camera" : "Scan customer QR"} →
              </button>
              <label>
                <span>Pickup QR token</span>
                <div>
                  <input
                    value={scan}
                    onChange={(e) => setScan(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && redeem()}
                    placeholder="Paste signed QR token"
                  />
                  <button onClick={redeem}>Verify →</button>
                </div>
              </label>
            </section>
            <aside
              className={`scan-result ${scanResult ? (scanResult.ok ? "ok" : "bad") : ""}`}
            >
              {scanResult ? (
                <>
                  <span>{scanResult.ok ? "✓" : "!"}</span>
                  <h3>{scanResult.ok ? "Verified" : "Cannot redeem"}</h3>
                  <p>{scanResult.message}</p>
                  {scanResult.order && (
                    <div>
                      <b>{scanResult.order.id}</b>
                      <small>
                        {
                          adminStores.find(
                            (store) =>
                              store.code === scanResult.order?.storeId,
                          )?.name
                        }
                      </small>
                      <strong>{money(scanResult.order.total)}</strong>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <span>⌗</span>
                  <h3>Waiting for a code</h3>
                  <p>
                    The verification result and order summary will appear here.
                  </p>
                </>
              )}
            </aside>
          </div>
        )}

        {tab === "customers" && (
          <section className="admin-panel wide">
            <PanelHead title="Customers" />
            <div className="customer-table">
              <div className="table-head">
                <span>Customer</span>
                <span>Status</span>
                <span>Lifetime</span>
                <span>Orders</span>
                <span>Action</span>
              </div>
              {customers.map((c) => (
                <div className="customer-row" key={c.id}>
                  <span>
                    <i>
                      {c.nickname
                        .split(" ")
                        .map((x) => x[0])
                        .join("")}
                    </i>
                    <b>
                      {c.nickname}
                      <small>{c.email || "No email"}</small>
                    </b>
                  </span>
                  <span>
                    <em data-status={c.status.toLowerCase()}>{c.status}</em>
                  </span>
                  <strong>{money(c.lifetime_value)}</strong>
                  <span>{c.order_count}</span>
                  <button onClick={() => void openCustomer(c)}>Manage →</button>
                </div>
              ))}
            </div>
          </section>
        )}

        {tab === "stores" && (
          <section className="admin-panel wide">
            <PanelHead title="Nairobi stores" />
            <div className="admin-store-grid">
              {adminStores.map((store, i) => (
                <article key={store.id}>
                  <span>0{i + 1}</span>
                  <div>
                    <h3>{store.name}</h3>
                    <p>{store.address}</p>
                    <small>{store.phone || "No phone"}</small>
                  </div>
                  <span className="store-card-actions">
                    <em
                      className={
                        store.location_verified ? "verified" : "pending"
                      }
                    >
                      {store.location_verified ? "Verified" : "Confirm details"}
                    </em>
                    <button onClick={() => setEditingStore({ ...store })}>
                      Edit →
                    </button>
                  </span>
                </article>
              ))}
            </div>
            <div className="store-warning">
              ⓘ Public KIYOYO sources currently verify four branches. Eastleigh
              and Store 06 require exact operations data before production
              launch.
            </div>
          </section>
        )}
      </main>
      {editingProduct && (
        <div className="modal-backdrop">
          <div className="admin-product-modal">
            <button
              className="modal-close"
              onClick={() => setEditingProduct(null)}
            >
              ×
            </button>
            <span className="red-label">EDIT PRODUCT</span>
            <h2>{editingProduct.name}</h2>
            <div className="product-image-editor">
              <img src={editingProduct.image} alt="Product preview" />
              <label>
                <strong>Replace image</strong>
                <span>JPG, PNG or WebP · signed Cloud Storage upload</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => updateProductImage(e.target.files?.[0])}
                />
              </label>
            </div>
            <label className="form-field">
              <span>Image path / URL</span>
              <input
                value={editingProduct.image}
                onChange={(e) =>
                  setEditingProduct({
                    ...editingProduct,
                    image: e.target.value,
                  })
                }
              />
            </label>
            <div className="form-split">
              <label className="form-field">
                <span>Product type</span>
                <input value={editingProduct.kind} disabled />
              </label>
              <label className="form-field">
                <span>Category</span>
                <select
                  value={editingProduct.category}
                  onChange={(event) =>
                    setEditingProduct({
                      ...editingProduct,
                      category: event.target.value,
                    })
                  }
                >
                  {(editingProduct.kind === "drink"
                    ? drinkCategoryOrder
                    : goodsCategoryOrder
                  ).map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                  {!(editingProduct.kind === "drink"
                    ? drinkCategoryOrder
                    : goodsCategoryOrder
                  ).some(
                    (category) => category === editingProduct.category,
                  ) && (
                    <option value={editingProduct.category}>
                      {editingProduct.category}
                    </option>
                  )}
                </select>
              </label>
            </div>
            <div className="form-split">
              <label className="form-field">
                <span>English name</span>
                <input
                  value={editingProduct.name}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      name: e.target.value,
                    })
                  }
                />
              </label>
              <label className="form-field">
                <span>Chinese name</span>
                <input
                  value={editingProduct.nameZh}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      nameZh: e.target.value,
                    })
                  }
                />
              </label>
            </div>
            <div className="form-split">
              <label className="form-field">
                <span>Base price (KSh)</span>
                <input
                  type="number"
                  min="1"
                  value={editingProduct.price}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      price: Number(e.target.value),
                    })
                  }
                />
              </label>
              <label className="form-field">
                <span>Discount %</span>
                <input
                  type="number"
                  min="0"
                  max="90"
                  value={editingProduct.discountPercent || 0}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      discountPercent: Number(e.target.value),
                    })
                  }
                />
              </label>
            </div>
            <label className="form-field tag-assignment">
              <span>Product tag</span>
              <select
                value={editingProduct.tagId || ""}
                onChange={(e) =>
                  setEditingProduct({
                    ...editingProduct,
                    tagId: e.target.value || undefined,
                    badge: undefined,
                  })
                }
              >
                <option value="">No tag</option>
                {productTags.map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    {tag.label} · {tag.tone}
                  </option>
                ))}
              </select>
              {editingProduct.tagId &&
                productTags.find((tag) => tag.id === editingProduct.tagId) && (
                  <em
                    className="tag-chip"
                    data-tone={
                      productTags.find((tag) => tag.id === editingProduct.tagId)
                        ?.tone
                    }
                  >
                    {
                      productTags.find((tag) => tag.id === editingProduct.tagId)
                        ?.label
                    }
                  </em>
                )}
              <small>
                Create reusable tags from Manage tags before assigning them.
              </small>
            </label>
            <div className="sale-preview">
              <span>Customer price</span>
              <strong>{money(salePrice(editingProduct))}</strong>
              {(editingProduct.discountPercent || 0) > 0 && (
                <del>{money(editingProduct.price)}</del>
              )}
            </div>
            <label className="admin-publish-check">
              <input
                type="checkbox"
                checked={editingProduct.active !== false}
                onChange={(e) =>
                  setEditingProduct({
                    ...editingProduct,
                    active: e.target.checked,
                  })
                }
              />
              <span>
                <strong>Published on storefront</strong>
                <small>Uncheck to hide this item and block checkout.</small>
              </span>
            </label>
            {productError && <div className="form-error">{productError}</div>}
            <button className="primary full" onClick={saveProduct}>
              Save & sync →
            </button>
            <small className="admin-sync-note">
              Product data is stored in Cloud SQL; uploaded images use the
              private KIYOYO media bucket.
            </small>
          </div>
        </div>
      )}
      {editingCoupon && (
        <div className="modal-backdrop">
          <section ref={couponDialogRef} className="admin-record-modal coupon-editor" role="dialog" aria-modal="true" aria-labelledby="coupon-editor-title">
            <button className="modal-close" aria-label="Close coupon editor" onClick={() => setEditingCoupon(null)}>×</button>
            <span className="red-label">COUPON DRAFT</span>
            <h2 id="coupon-editor-title">{editingCoupon.id ? editingCoupon.name_en : "Create coupon"}</h2>
            <p>Save the rule as a draft. Publishing remains a separate customer-visible action.</p>
            {editingCoupon.redeemed_count > 0 && (
              <div className="admin-info-note">This rule has redemptions and is now read-only. Duplicate it to create a new version.</div>
            )}
            <fieldset disabled={editingCoupon.redeemed_count > 0 || couponBusy}>
              <div className="form-split">
                <label className="form-field">
                  <span>Code</span>
                  <input value={editingCoupon.code} maxLength={40} placeholder="HAPPY20" onChange={(event) => setEditingCoupon({ ...editingCoupon, code: event.target.value.toUpperCase() })} />
                </label>
                <label className="form-field">
                  <span>Distribution</span>
                  <select value={editingCoupon.issuance_mode} onChange={(event) => setEditingCoupon({ ...editingCoupon, issuance_mode: event.target.value as AdminCoupon["issuance_mode"] })}>
                    <option value="ASSIGNED">Member wallet</option>
                    <option value="PUBLIC_CODE">Public code</option>
                  </select>
                </label>
              </div>
              <div className="form-split">
                <label className="form-field">
                  <span>English name</span>
                  <input value={editingCoupon.name_en} onChange={(event) => setEditingCoupon({ ...editingCoupon, name_en: event.target.value })} />
                </label>
                <label className="form-field">
                  <span>Chinese name</span>
                  <input value={editingCoupon.name_zh} onChange={(event) => setEditingCoupon({ ...editingCoupon, name_zh: event.target.value })} />
                </label>
              </div>
              <div className="form-split">
                <label className="form-field">
                  <span>English description</span>
                  <textarea value={editingCoupon.description_en} onChange={(event) => setEditingCoupon({ ...editingCoupon, description_en: event.target.value })} />
                </label>
                <label className="form-field">
                  <span>Chinese description</span>
                  <textarea value={editingCoupon.description_zh} onChange={(event) => setEditingCoupon({ ...editingCoupon, description_zh: event.target.value })} />
                </label>
              </div>
              <div className="form-split three">
                <label className="form-field">
                  <span>Offer type</span>
                  <select value={editingCoupon.discount_type} onChange={(event) => setEditingCoupon({ ...editingCoupon, discount_type: event.target.value as AdminCoupon["discount_type"], discount_value: event.target.value === "FREE_SIZE_UPGRADE" ? 0 : editingCoupon.discount_value || 10 })}>
                    <option value="PERCENT">Percentage</option>
                    <option value="FIXED">Fixed amount</option>
                    <option value="FREE_SIZE_UPGRADE">Free size upgrade</option>
                  </select>
                </label>
                <label className="form-field">
                  <span>{editingCoupon.discount_type === "PERCENT" ? "Percentage" : "Amount (KSh)"}</span>
                  <input type="number" min="0" max={editingCoupon.discount_type === "PERCENT" ? 100 : undefined} disabled={editingCoupon.discount_type === "FREE_SIZE_UPGRADE"} value={editingCoupon.discount_value} onChange={(event) => setEditingCoupon({ ...editingCoupon, discount_value: Number(event.target.value) })} />
                </label>
                <label className="form-field">
                  <span>Maximum discount</span>
                  <input type="number" min="0" placeholder="No cap" value={editingCoupon.max_discount ?? ""} onChange={(event) => setEditingCoupon({ ...editingCoupon, max_discount: event.target.value ? Number(event.target.value) : null })} />
                </label>
              </div>
              <div className="form-split three">
                <label className="form-field">
                  <span>Applies to</span>
                  <select value={editingCoupon.scope_type} onChange={(event) => setEditingCoupon({ ...editingCoupon, scope_type: event.target.value as AdminCoupon["scope_type"], scope_value: null })}>
                    <option value="ALL">All products</option>
                    <option value="DRINKS">All drinks</option>
                    <option value="GOODS">All goods</option>
                    <option value="CATEGORY">Category</option>
                    <option value="PRODUCT">Product</option>
                  </select>
                </label>
                <label className="form-field">
                  <span>Scope selection</span>
                  {editingCoupon.scope_type === "CATEGORY" ? (
                    <select value={editingCoupon.scope_value ?? ""} onChange={(event) => setEditingCoupon({ ...editingCoupon, scope_value: event.target.value })}>
                      <option value="">Choose category</option>
                      {[...new Set(catalog.map((product) => categorySlug(product.category)))].map((category) => <option key={category} value={category}>{category}</option>)}
                    </select>
                  ) : editingCoupon.scope_type === "PRODUCT" ? (
                    <select value={editingCoupon.scope_value ?? ""} onChange={(event) => setEditingCoupon({ ...editingCoupon, scope_value: event.target.value })}>
                      <option value="">Choose product</option>
                      {catalog.map((product) => <option key={product.apiId ?? product.id} value={product.apiId ?? product.id}>{product.name}</option>)}
                    </select>
                  ) : <input value="Automatically selected" disabled />}
                </label>
                <label className="form-field">
                  <span>Fulfilment</span>
                  <select value={editingCoupon.fulfillment_scope} onChange={(event) => setEditingCoupon({ ...editingCoupon, fulfillment_scope: event.target.value as AdminCoupon["fulfillment_scope"] })}>
                    <option value="ALL">All methods</option>
                    <option value="PICKUP">Pickup</option>
                    <option value="DELIVERY">Delivery</option>
                    <option value="SHIPPING">Shipping</option>
                  </select>
                </label>
              </div>
              <div className="form-split four">
                <label className="form-field"><span>Minimum spend (KSh)</span><input type="number" min="0" value={editingCoupon.min_spend} onChange={(event) => setEditingCoupon({ ...editingCoupon, min_spend: Number(event.target.value) })} /></label>
                <label className="form-field"><span>Issue limit</span><input type="number" min="1" placeholder="Unlimited" value={editingCoupon.issuance_limit ?? ""} onChange={(event) => setEditingCoupon({ ...editingCoupon, issuance_limit: event.target.value ? Number(event.target.value) : null })} /></label>
                <label className="form-field"><span>Use limit</span><input type="number" min="1" placeholder="Unlimited" value={editingCoupon.usage_limit ?? ""} onChange={(event) => setEditingCoupon({ ...editingCoupon, usage_limit: event.target.value ? Number(event.target.value) : null })} /></label>
                <label className="form-field"><span>Per customer</span><input type="number" min="1" max="100" value={editingCoupon.per_user_limit} onChange={(event) => setEditingCoupon({ ...editingCoupon, per_user_limit: Number(event.target.value) })} /></label>
              </div>
              <div className="form-split">
                <label className="form-field"><span>Starts (Nairobi time)</span><input type="datetime-local" value={inputDateTime(editingCoupon.starts_at)} onChange={(event) => setEditingCoupon({ ...editingCoupon, starts_at: nairobiDateTimeIso(event.target.value) })} /></label>
                <label className="form-field"><span>Ends (Nairobi time)</span><input type="datetime-local" value={inputDateTime(editingCoupon.ends_at)} onChange={(event) => setEditingCoupon({ ...editingCoupon, ends_at: nairobiDateTimeIso(event.target.value) })} /></label>
              </div>
            </fieldset>
            <div className="coupon-customer-preview">
              <span>Customer preview</span>
              <strong>{editingCoupon.discount_type === "PERCENT" ? `${editingCoupon.discount_value}%` : editingCoupon.discount_type === "FIXED" ? money(editingCoupon.discount_value) : "FREE"}</strong>
              <div><b>{editingCoupon.name_en || "Coupon name"}</b><small>{editingCoupon.code || "CODE"} · Min. {money(editingCoupon.min_spend)}</small></div>
            </div>
            {couponError && <div className="form-error" role="alert">{couponError}</div>}
            {editingCoupon.redeemed_count === 0 && (
              <button className="primary full" disabled={couponBusy} onClick={() => void saveCoupon()}>{couponBusy ? "Saving…" : editingCoupon.id ? "Save coupon draft →" : "Create draft →"}</button>
            )}
            <small className="admin-sync-note">After saving, publish from the coupon list. Dates are displayed in Africa/Nairobi.</small>
          </section>
        </div>
      )}
      {selectedCustomer && (
        <div className="modal-backdrop">
          <section className="admin-record-modal">
            <button
              className="modal-close"
              onClick={() => setSelectedCustomer(null)}
            >
              ×
            </button>
            <span className="red-label">CUSTOMER RECORD</span>
            <h2>{selectedCustomer.nickname}</h2>
            <p>{selectedCustomer.email || "No email"}</p>
            <div className="form-split">
              <label className="form-field">
                <span>Nickname</span>
                <input
                  value={selectedCustomer.nickname}
                  onChange={(event) =>
                    setSelectedCustomer({
                      ...selectedCustomer,
                      nickname: event.target.value,
                    })
                  }
                />
              </label>
              <label className="form-field">
                <span>Account status</span>
                <select
                  value={selectedCustomer.status}
                  onChange={(event) =>
                    setSelectedCustomer({
                      ...selectedCustomer,
                      status: event.target.value as AdminCustomer["status"],
                    })
                  }
                >
                  <option value="ACTIVE">Active</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
              </label>
            </div>
            <div className="record-facts">
              <span>
                <small>Orders</small>
                <strong>{selectedCustomer.order_count}</strong>
              </span>
              <span>
                <small>Lifetime value</small>
                <strong>{money(selectedCustomer.lifetime_value)}</strong>
              </span>
              <span>
                <small>Joined</small>
                <strong>
                  {new Date(selectedCustomer.created_at).toLocaleDateString(
                    "en-KE",
                  )}
                </strong>
              </span>
            </div>
            <h3>Delivery addresses</h3>
            <div className="record-list">
              {selectedCustomer.addresses.length ? (
                selectedCustomer.addresses.map((address) => (
                  <article key={address.id}>
                    <strong>
                      {address.label} {address.is_default ? "· Default" : ""}
                    </strong>
                    <span>
                      {address.contact_name} · {address.phone_e164}
                    </span>
                    <small>
                      {address.line1}, {address.area}, {address.city}
                    </small>
                  </article>
                ))
              ) : (
                <small>No saved addresses.</small>
              )}
            </div>
            <h3>Coupons</h3>
            <div className="customer-coupon-issuer">
              <select
                aria-label="Coupon to issue"
                value={issueCouponId}
                onChange={(event) => setIssueCouponId(event.target.value)}
              >
                <option value="">Choose a published member coupon</option>
                {coupons
                  .filter(
                    (coupon) =>
                      coupon.issuance_mode === "ASSIGNED" &&
                      coupon.issuance_enabled &&
                      ["ACTIVE", "SCHEDULED"].includes(coupon.effective_status),
                  )
                  .map((coupon) => (
                    <option key={coupon.id} value={coupon.id}>
                      {coupon.name_en} · {coupon.code}
                    </option>
                  ))}
              </select>
              <button disabled={!issueCouponId || couponBusy || selectedCustomer.status !== "ACTIVE"} onClick={() => void issueCoupon()}>
                {couponBusy ? "Issuing…" : "Issue coupon"}
              </button>
            </div>
            {couponError && <div className="form-error" role="alert">{couponError}</div>}
            <div className="record-list compact customer-coupon-list">
              {selectedCustomer.coupons.length ? (
                selectedCustomer.coupons.map((coupon) => (
                  <article key={coupon.user_coupon_id}>
                    <strong>{coupon.name_en} · {coupon.code}</strong>
                    <span>{coupon.wallet_status}</span>
                    <small>Expires {new Date(coupon.expires_at).toLocaleDateString("en-KE")}</small>
                    {coupon.status === "ISSUED" && coupon.wallet_status !== "EXPIRED" && (
                      <button className="danger-text" disabled={couponBusy} onClick={() => void revokeUserCoupon(coupon.user_coupon_id)}>Revoke</button>
                    )}
                  </article>
                ))
              ) : (
                <small>No coupons issued.</small>
              )}
            </div>
            <h3>Recent orders</h3>
            <div className="record-list compact">
              {selectedCustomer.orders.length ? (
                selectedCustomer.orders.map((order) => (
                  <article key={order.order_number}>
                    <strong>{order.order_number}</strong>
                    <span>{order.payment_status}</span>
                    <small>{money(order.total)}</small>
                  </article>
                ))
              ) : (
                <small>No orders yet.</small>
              )}
            </div>
            <button className="primary full" onClick={() => void saveCustomer()}>
              Save customer →
            </button>
          </section>
        </div>
      )}
      {editingStore && (
        <div className="modal-backdrop">
          <section className="admin-record-modal">
            <button className="modal-close" onClick={() => setEditingStore(null)}>
              ×
            </button>
            <span className="red-label">STORE SETTINGS</span>
            <h2>{editingStore.name}</h2>
            <div className="form-split">
              <label className="form-field">
                <span>Store name</span>
                <input
                  value={editingStore.name}
                  onChange={(event) =>
                    setEditingStore({ ...editingStore, name: event.target.value })
                  }
                />
              </label>
              <label className="form-field">
                <span>Status</span>
                <select
                  value={editingStore.status}
                  onChange={(event) =>
                    setEditingStore({
                      ...editingStore,
                      status: event.target.value as AdminStore["status"],
                    })
                  }
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="COMING_SOON">Coming soon</option>
                </select>
              </label>
            </div>
            <label className="form-field">
              <span>Address</span>
              <input
                value={editingStore.address}
                onChange={(event) =>
                  setEditingStore({ ...editingStore, address: event.target.value })
                }
              />
            </label>
            <label className="form-field">
              <span>Phone</span>
              <input
                value={editingStore.phone ?? ""}
                onChange={(event) =>
                  setEditingStore({ ...editingStore, phone: event.target.value })
                }
              />
            </label>
            <div className="form-split">
              <label className="form-field">
                <span>Latitude</span>
                <input
                  type="number"
                  step="0.000001"
                  value={editingStore.lat ?? ""}
                  onChange={(event) =>
                    setEditingStore({
                      ...editingStore,
                      lat: event.target.value ? Number(event.target.value) : null,
                    })
                  }
                />
              </label>
              <label className="form-field">
                <span>Longitude</span>
                <input
                  type="number"
                  step="0.000001"
                  value={editingStore.lng ?? ""}
                  onChange={(event) =>
                    setEditingStore({
                      ...editingStore,
                      lng: event.target.value ? Number(event.target.value) : null,
                    })
                  }
                />
              </label>
            </div>
            <div className="store-switches">
              <label>
                <input
                  type="checkbox"
                  checked={editingStore.pickup_enabled}
                  onChange={(event) =>
                    setEditingStore({
                      ...editingStore,
                      pickup_enabled: event.target.checked,
                    })
                  }
                />
                Pickup enabled
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={editingStore.delivery_enabled}
                  onChange={(event) =>
                    setEditingStore({
                      ...editingStore,
                      delivery_enabled: event.target.checked,
                    })
                  }
                />
                Delivery enabled
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={editingStore.location_verified}
                  onChange={(event) =>
                    setEditingStore({
                      ...editingStore,
                      location_verified: event.target.checked,
                    })
                  }
                />
                Location verified by operations
              </label>
            </div>
            <button className="primary full" onClick={() => void saveStore()}>
              Save store →
            </button>
          </section>
        </div>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  note,
  trend,
}: {
  label: string;
  value: string;
  note: string;
  trend: string;
}) {
  return (
    <article className="metric">
      <div>
        <span>{label}</span>
        <b>{trend}</b>
      </div>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}
function PanelHead({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="panel-head">
      <h2>{title}</h2>
      {action && <button onClick={onAction}>{action} →</button>}
    </div>
  );
}
function OrderTable({
  orders,
  catalog,
  stores,
  onStatus,
}: {
  orders: Order[];
  catalog: Product[];
  stores: AdminStore[];
  onStatus: (id: string, status: Order["status"]) => void;
}) {
  return (
    <div className="order-table">
      <div className="table-head">
        <span>Order</span>
        <span>Store / channel</span>
        <span>Items</span>
        <span>Total</span>
        <span>Status</span>
      </div>
      {orders.map((o) => (
        <div className="order-row" key={o.id}>
          <span>
            <strong>{o.id}</strong>
            <small>
              {new Date(o.createdAt).toLocaleTimeString("en-KE", {
                hour: "2-digit",
                minute: "2-digit",
                timeZone: "Africa/Nairobi",
              })}
            </small>
          </span>
          <span>
            <b>
              {stores.find((store) => store.code === o.storeId)?.area ||
                o.storeId}
            </b>
            <small>{o.channel}</small>
          </span>
          <span className="item-stack">
            {o.items.slice(0, 3).map((i) => (
              <img
                key={i.key}
                src={catalog.find((p) => p.id === i.productId)?.image}
                alt=""
              />
            ))}
          </span>
          <strong>{money(o.total)}</strong>
          <select
            className={`status-select s-${o.status.toLowerCase()}`}
            value={o.status}
            onChange={(e) => onStatus(o.id, e.target.value as Order["status"])}
          >
            <option>Placed</option>
            <option>Confirmed</option>
            <option>Preparing</option>
            <option>Ready</option>
            <option>Completed</option>
            <option>Cancelled</option>
          </select>
        </div>
      ))}
    </div>
  );
}
