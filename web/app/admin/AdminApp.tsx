"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { drinkCategoryOrder } from "../menu";
import {
  resolveProductTag,
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
import type {
  AdminCoupon,
  AdminCustomer,
  AdminState,
  AdminStore,
  AdminTab,
  CustomerDetail,
  QrDetectorConstructor,
} from "./core/types";
import {
  categorySlug,
  goodsCategoryOrder,
} from "./core/foundation";
import { OverviewView } from "./overview/OverviewView";
import { OrdersView } from "./orders/OrdersView";
import { ProductsView } from "./products/ProductsView";
import { ProductEditorDialog } from "./products/ProductEditorDialog";
import { CouponsView } from "./coupons/CouponsView";
import { CouponEditorDialog } from "./coupons/CouponEditorDialog";
import { RedeemView } from "./redeem/RedeemView";
import { CustomersView } from "./customers/CustomersView";
import { CustomerEditorDialog } from "./customers/CustomerEditorDialog";
import { StoresView } from "./stores/StoresView";
import { StoreEditorDialog } from "./stores/StoreEditorDialog";
import { AdminSidebar, AdminTopbar } from "./shell/AdminShell";

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
      <AdminSidebar
        tab={tab}
        setTab={setTab}
        activeCount={active.length}
        adminEmail={adminEmail}
      />
      <main className="admin-main">
        <AdminTopbar
          tab={tab}
          cloudStatus={cloudStatus}
          activeCount={active.length}
        />

        {tab === "overview" && (
          <OverviewView
            orders={orders}
            active={active}
            revenue={revenue}
            customers={customers}
            setTab={setTab}
            catalog={catalog}
            adminStores={adminStores}
            changeStatus={changeStatus}
          />
        )}

        {tab === "orders" && (
          <OrdersView
            storeFilter={storeFilter}
            setStoreFilter={setStoreFilter}
            adminStores={adminStores}
            shown={shown}
            catalog={catalog}
            changeStatus={changeStatus}
          />
        )}

        {tab === "products" && (
          <ProductsView
            catalog={catalog}
            productTags={productTags}
            showTagManager={showTagManager}
            setShowTagManager={setShowTagManager}
            newTag={newTag}
            setNewTag={setNewTag}
            addTag={addTag}
            tagError={tagError}
            deleteTag={deleteTag}
            productSearch={productSearch}
            setProductSearch={setProductSearch}
            productKind={productKind}
            setProductKind={setProductKind}
            productCategory={productCategory}
            setProductCategory={setProductCategory}
            categoryOptions={categoryOptions}
            shownProducts={shownProducts}
            toggleProduct={toggleProduct}
            openProductEditor={openProductEditor}
          />
        )}

        {tab === "coupons" && (
          <CouponsView
            coupons={coupons}
            setCouponError={setCouponError}
            setEditingCoupon={setEditingCoupon}
            couponError={couponError}
            couponBusy={couponBusy}
            runCouponAction={runCouponAction}
          />
        )}

        {tab === "redeem" && (
          <RedeemView
            storeFilter={storeFilter}
            setStoreFilter={setStoreFilter}
            adminStores={adminStores}
            scannerActive={scannerActive}
            videoRef={videoRef}
            stopScanner={stopScanner}
            startScanner={startScanner}
            scan={scan}
            setScan={setScan}
            redeem={redeem}
            scanResult={scanResult}
          />
        )}

        {tab === "customers" && (
          <CustomersView customers={customers} openCustomer={openCustomer} />
        )}

        {tab === "stores" && (
          <StoresView
            adminStores={adminStores}
            setEditingStore={setEditingStore}
          />
        )}
      </main>
      {editingProduct && (
        <ProductEditorDialog
          editingProduct={editingProduct}
          setEditingProduct={setEditingProduct}
          updateProductImage={updateProductImage}
          productTags={productTags}
          productError={productError}
          saveProduct={saveProduct}
        />
      )}
      {editingCoupon && (
        <CouponEditorDialog
          editingCoupon={editingCoupon}
          setEditingCoupon={setEditingCoupon}
          couponDialogRef={couponDialogRef}
          couponBusy={couponBusy}
          catalog={catalog}
          couponError={couponError}
          saveCoupon={saveCoupon}
        />
      )}
      {selectedCustomer && (
        <CustomerEditorDialog
          selectedCustomer={selectedCustomer}
          setSelectedCustomer={setSelectedCustomer}
          issueCouponId={issueCouponId}
          setIssueCouponId={setIssueCouponId}
          coupons={coupons}
          couponBusy={couponBusy}
          issueCoupon={issueCoupon}
          couponError={couponError}
          revokeUserCoupon={revokeUserCoupon}
          saveCustomer={saveCustomer}
        />
      )}
      {editingStore && (
        <StoreEditorDialog
          editingStore={editingStore}
          setEditingStore={setEditingStore}
          saveStore={saveStore}
        />
      )}
    </div>
  );
}
