"use client";
/* eslint-disable @next/next/no-img-element -- Local prototype assets retain original campaign cropping. */

import { useEffect, useRef, useState } from "react";
import { haversineKm, money, stores } from "../data";
import { drinkCategoryOrder, drinkCategoryZh } from "../menu";
import {
  resolveProductTag,
  salePrice,
  useCatalog,
  useProductTags,
} from "../catalog";
import {
  apiFetch,
  fetchMemberCoupons,
  fetchMemberOrders,
  observeMember,
  pickupTokenFingerprint,
  reissuePickupToken,
  sendMemberPasswordReset,
  sendMemberVerification,
  signInMember,
  signOutMember,
} from "../platform";
import GoogleStoreMap from "./GoogleStoreMap";
import {
  categorySlug,
  couponStatusLabel,
  drinkCategoryAnchor,
  drinkMenuTagRank,
  emptyAddress,
  emptyProfile,
} from "./customer/foundation";
import {
  DrinkMenuCard,
  Logo,
  NavIcon,
  Option,
  PickupQR,
  ProductCard,
  SectionHead,
  productSizeEntries,
} from "./customer/primitives";
import { useStoredState } from "./customer/useStoredState";
import { copy } from "./customer/copy";
import type {
  Address,
  AuthProvider,
  AuthSession,
  CartItem,
  Lang,
  Order,
  Product,
  Tab,
  UserCoupon,
  UserProfile,
} from "../types";

export default function KiyoyoApp() {
  const [lang, setLang] = useStoredState<Lang>("kiyoyo-lang", "en");
  const [catalog] = useCatalog();
  const [productTags] = useProductTags();
  const [tab, setTab] = useState<Tab>("home");
  const [storeId, setStoreId] = useStoredState("kiyoyo-store", "kilimani");
  const [cart, setCart] = useStoredState<CartItem[]>("kiyoyo-cart", []);
  const [saved, setSaved] = useStoredState<string[]>("kiyoyo-saved", [
    "g1",
    "d6",
  ]);
  const [orders, setOrders] = useStoredState<Order[]>("kiyoyo-orders", []);
  const ordersRef = useRef<Order[]>(orders);
  const [session, setSession] = useStoredState<AuthSession | null>(
    "kiyoyo-session",
    null,
  );
  const [profile, setProfile] = useStoredState<UserProfile>(
    "kiyoyo-profile",
    emptyProfile,
  );
  const [modalProduct, setModalProduct] = useState<Product | null>(null);
  const [storeModal, setStoreModal] = useState(false);
  const [checkout, setCheckout] = useState(false);
  const [success, setSuccess] = useState<Order | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [pickupQrLoading, setPickupQrLoading] = useState(false);
  const [pickupQrError, setPickupQrError] = useState("");
  const [accountPanel, setAccountPanel] = useState<
    "coupons" | "rewards" | "history"
  >("coupons");
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState(false);
  const [distances, setDistances] = useState<Record<string, number>>({});
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [globalQuery, setGlobalQuery] = useState("");
  const [filter, setFilter] = useState<string>(drinkCategoryOrder[0]);
  const [shopMode, setShopMode] = useState<"drinks" | "goods">("drinks");
  const drinkCategoryNavRef = useRef<HTMLElement>(null);
  const pendingDrinkCategoryRef = useRef<string | null>(null);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [bannerPointerPaused, setBannerPointerPaused] = useState(false);
  const [bannerFocusPaused, setBannerFocusPaused] = useState(false);
  const [bannerPageVisible, setBannerPageVisible] = useState(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [custom, setCustom] = useState({
    size: "Regular",
    sugar: "50%",
    ice: "Less ice",
    toppings: [] as string[],
  });
  const [authMode, setAuthMode] = useState<"signin" | "signup" | null>(null);
  const [authForm, setAuthForm] = useState({ email: "", password: "" });
  const [authError, setAuthError] = useState("");
  const [profileModal, setProfileModal] = useState(false);
  const [profileForm, setProfileForm] = useState({
    nickname: "",
    gender: "" as UserProfile["gender"],
    age: "",
  });
  const [addressModal, setAddressModal] = useState(false);
  const [addressForm, setAddressForm] = useState<Address>(emptyAddress);
  const [addressError, setAddressError] = useState("");
  const [checkoutChannel, setCheckoutChannel] = useState<
    Order["channel"] | null
  >(null);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [pendingCheckout, setPendingCheckout] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [userCoupons, setUserCoupons] = useState<UserCoupon[]>([]);
  const [couponsLoading, setCouponsLoading] = useState(false);
  const [selectedCouponId, setSelectedCouponId] = useState("");
  const [couponCodeInput, setCouponCodeInput] = useState("");
  const [checkoutError, setCheckoutError] = useState("");
  const [placingOrder, setPlacingOrder] = useState(false);
  const products = catalog
    .filter((product) => product.active !== false)
    .map((product) => {
      const tag = resolveProductTag(product, productTags);
      return {
        ...product,
        badge: tag?.label ?? (product.tagId ? undefined : product.badge),
        badgeTone: tag?.tone,
      };
    });
  const t = copy[lang];
  const selectedStore = stores.find((s) => s.id === storeId) || stores[0];
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const selectedOrderStore = selectedOrder
    ? (selectedOrder.storeSnapshot ??
      stores.find((store) => store.id === selectedOrder.storeId))
    : undefined;
  const selectedOrderAddress = selectedOrder
    ? (selectedOrder.addressSnapshot ??
      profile.addresses.find(
        (address) => address.id === selectedOrder.addressId,
      ))
    : undefined;

  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  useEffect(
    () =>
      observeMember(async (user) => {
        if (!user) {
          setSession(null);
          setOrders([]);
          setUserCoupons([]);
          setCouponsLoading(false);
          setSelectedCouponId("");
          return;
        }
        const providerId = user.providerData[0]?.providerId;
        const provider: AuthProvider =
          providerId === "google.com"
            ? "google"
            : providerId === "facebook.com"
              ? "facebook"
              : "password";
        setSession({ id: user.uid, email: user.email ?? "", provider });
        setCouponsLoading(true);
        try {
          await apiFetch("/v1/auth/bootstrap", {
            method: "POST",
            body: JSON.stringify({
              nickname:
                user.displayName ||
                user.email?.split("@")[0] ||
                "KIYOYO Member",
              locale: lang,
            }),
          });
          const [member, addressPayload, remoteOrders, remoteCoupons] = await Promise.all([
            apiFetch<{
              data: {
                nickname: string;
                gender: string | null;
                birth_year: number | null;
              };
            }>("/v1/me"),
            apiFetch<{
              data: Array<{
                id: string;
                label: string;
                contact_name: string;
                phone_e164: string;
                area: string;
                line1: string;
                delivery_instructions?: string;
                is_default: boolean;
              }>;
            }>("/v1/me/addresses"),
            fetchMemberOrders(),
            fetchMemberCoupons(),
          ]);
          setUserCoupons(remoteCoupons);
          setCouponsLoading(false);
          const genderMap: Record<string, UserProfile["gender"]> = {
            FEMALE: "Female",
            MALE: "Male",
            NON_BINARY: "Non-binary",
            PREFER_NOT_TO_SAY: "Prefer not to say",
          };
          setProfile({
            nickname: member.data.nickname,
            gender: member.data.gender ? genderMap[member.data.gender] : "",
            age: member.data.birth_year
              ? String(new Date().getFullYear() - member.data.birth_year)
              : "",
            addresses: addressPayload.data.map((address) => ({
              id: address.id,
              label: address.label,
              recipient: address.contact_name,
              phone: address.phone_e164,
              area: address.area,
              line1: address.line1,
              instructions: address.delivery_instructions,
              isDefault: address.is_default,
            })),
          });
          const localOrders = ordersRef.current;
          const remoteIds = new Set(remoteOrders.map((order) => order.id));
          const mergedRemote = await Promise.all(
            remoteOrders.map(async (remoteOrder) => {
              const localOrder = localOrders.find(
                (order) => order.id === remoteOrder.id,
              );
              const localPickupCode =
                localOrder?.pickupCode &&
                localOrder.pickupCode !== "NO-PICKUP"
                  ? localOrder.pickupCode
                  : undefined;
              const localPickupIsCurrent =
                localPickupCode && remoteOrder.pickupFingerprint
                  ? (await pickupTokenFingerprint(localPickupCode)) ===
                    remoteOrder.pickupFingerprint
                  : false;
              return {
                ...remoteOrder,
                pickupCode: localPickupIsCurrent && localPickupCode
                  ? localPickupCode
                  : remoteOrder.pickupCode,
                addressSnapshot:
                  remoteOrder.addressSnapshot ?? localOrder?.addressSnapshot,
                storeSnapshot:
                  remoteOrder.storeSnapshot ?? localOrder?.storeSnapshot,
                items:
                  remoteOrder.items.length > 0
                    ? remoteOrder.items
                    : (localOrder?.items ?? []),
              };
            }),
          );
          setOrders([
            ...mergedRemote,
            ...localOrders.filter((order) => !remoteIds.has(order.id)),
          ]);
        } catch {
          setCouponsLoading(false);
          /* preserve the local fallback if the API is temporarily unavailable */
        }
      }),
    [lang, setOrders, setProfile, setSession],
  );

  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncMotionPreference = () =>
      setPrefersReducedMotion(motionQuery.matches);
    syncMotionPreference();
    motionQuery.addEventListener("change", syncMotionPreference);
    return () =>
      motionQuery.removeEventListener("change", syncMotionPreference);
  }, []);

  useEffect(() => {
    const syncVisibility = () => setBannerPageVisible(!document.hidden);
    syncVisibility();
    document.addEventListener("visibilitychange", syncVisibility);
    return () =>
      document.removeEventListener("visibilitychange", syncVisibility);
  }, []);

  useEffect(() => {
    if (
      bannerPointerPaused ||
      bannerFocusPaused ||
      prefersReducedMotion ||
      !bannerPageVisible
    )
      return;
    const timer = window.setInterval(
      () => setBannerIndex((index) => (index + 1) % 3),
      6000,
    );
    return () => window.clearInterval(timer);
  }, [
    bannerFocusPaused,
    bannerPageVisible,
    bannerPointerPaused,
    prefersReducedMotion,
  ]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const isTyping =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;
      if (event.key === "/" && !isTyping) {
        event.preventDefault();
        setGlobalSearchOpen(true);
      }
      if (event.key === "Escape") setGlobalSearchOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const detailedCart = cart
    .map((item) => ({
      ...item,
      product: catalog.find((p) => p.id === item.productId)!,
    }))
    .filter((x) => x.product);
  const hasUnavailable = detailedCart.some(
    (item) => item.product.active === false,
  );
  const subtotal = detailedCart
    .filter((item) => item.product.active !== false)
    .reduce(
      (sum, item) =>
        sum +
        (salePrice(item.product, item.size) +
          (item.toppings ?? []).reduce(
            (toppingSum, toppingId) =>
              toppingSum +
              salePrice(
                catalog.find((product) => product.id === toppingId) ?? {
                  ...item.product,
                  price: 0,
                },
              ),
            0,
          )) *
          item.quantity,
      0,
    );
  const selectedCoupon = userCoupons.find(
    (coupon) => coupon.userCouponId === selectedCouponId,
  );
  const couponEligibleItems = selectedCoupon
    ? detailedCart.filter(({ product }) => {
        if (selectedCoupon.scopeType === "ALL") return true;
        if (selectedCoupon.scopeType === "DRINKS") return product.kind === "drink";
        if (selectedCoupon.scopeType === "GOODS") return product.kind === "goods";
        if (selectedCoupon.scopeType === "CATEGORY") {
          return categorySlug(product.category) === selectedCoupon.scopeValue;
        }
        return [product.id, product.apiId].includes(selectedCoupon.scopeValue ?? "");
      })
    : [];
  const couponEligibleSubtotal = couponEligibleItems.reduce(
    (sum, item) =>
      sum +
      (salePrice(item.product, item.size) +
        (item.toppings ?? []).reduce(
          (toppingSum, toppingId) =>
            toppingSum +
            salePrice(
              catalog.find((product) => product.id === toppingId) ?? {
                ...item.product,
                price: 0,
              },
            ),
          0,
        )) *
        item.quantity,
    0,
  );
  const selectedCouponMatchesFulfillment =
    !selectedCoupon ||
    !checkoutChannel ||
    selectedCoupon.fulfillmentScope === "ALL" ||
    selectedCoupon.fulfillmentScope === checkoutChannel.toUpperCase();
  let estimatedCouponDiscount = 0;
  if (
    selectedCoupon &&
    selectedCoupon.walletStatus === "AVAILABLE" &&
    selectedCouponMatchesFulfillment &&
    couponEligibleSubtotal >= selectedCoupon.minSpend
  ) {
    if (selectedCoupon.discountType === "PERCENT") {
      estimatedCouponDiscount = Math.round(
        (couponEligibleSubtotal * selectedCoupon.discountValue) / 100,
      );
    } else if (selectedCoupon.discountType === "FIXED") {
      estimatedCouponDiscount = selectedCoupon.discountValue;
    } else {
      estimatedCouponDiscount = couponEligibleItems.reduce((largest, item) => {
        const sizePrices = Object.values(item.product.sizePrices ?? {});
        const selectedPrice = item.size
          ? item.product.sizePrices?.[item.size]
          : undefined;
        if (!sizePrices.length || selectedPrice == null) return largest;
        return Math.max(largest, selectedPrice - Math.min(...sizePrices));
      }, 0);
    }
    if (selectedCoupon.maxDiscount != null) {
      estimatedCouponDiscount = Math.min(
        estimatedCouponDiscount,
        selectedCoupon.maxDiscount,
      );
    }
    estimatedCouponDiscount = Math.min(
      estimatedCouponDiscount,
      couponEligibleSubtotal,
    );
  }
  const checkoutDeliveryFee =
    checkoutChannel === "Delivery"
      ? 150
      : checkoutChannel === "Shipping"
        ? 300
        : 0;
  const estimatedCheckoutTotal = Math.max(
    0,
    subtotal - estimatedCouponDiscount + checkoutDeliveryFee,
  );

  const filteredProducts = products
    .filter((p) => {
      const matchesMode =
        shopMode === "drinks" ? p.kind === "drink" : p.kind === "goods";
      const matchesFilter =
        ["All", "Drinks", "Goods"].includes(filter) || p.category === filter;
      return matchesMode && matchesFilter;
    })
    .sort((first, second) =>
      shopMode === "drinks"
        ? first.id.localeCompare(second.id, undefined, { numeric: true })
        : 0,
    );
  const drinkGroups = drinkCategoryOrder
    .map((category) => ({
      category,
      products: products
        .filter(
          (product) =>
            product.kind === "drink" && product.category === category,
        )
        .sort(
          (first, second) =>
            drinkMenuTagRank(first) - drinkMenuTagRank(second) ||
            first.id.localeCompare(second.id, undefined, { numeric: true }),
        ),
    }))
    .filter((group) => group.products.length > 0);
  const trendingProducts = drinkGroups
    .filter((group) => group.category !== "Add-ons")
    .map((group) => group.products[0]);
  const addOnProducts = products.filter(
    (product) => product.kind === "drink" && product.category === "Add-ons",
  );

  useEffect(() => {
    if (tab !== "shop" || shopMode !== "drinks") return;

    const sections = Array.from(
      document.querySelectorAll<HTMLElement>("[data-drink-category]"),
    );
    if (sections.length === 0) return;

    const requestedCategory = pendingDrinkCategoryRef.current;
    if (requestedCategory) {
      pendingDrinkCategoryRef.current = null;
      window.requestAnimationFrame(() => {
        document
          .getElementById(
            `drink-category-${drinkCategoryAnchor(requestedCategory)}`,
          )
          ?.scrollIntoView({
            behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
              .matches
              ? "auto"
              : "smooth",
            block: "start",
          });
      });
    }

    let frame = 0;
    const updateActiveCategory = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const readingLine = Math.min(window.innerHeight * 0.28, 190);
        let activeSection = sections[0];

        for (const section of sections) {
          if (section.getBoundingClientRect().top <= readingLine) {
            activeSection = section;
          } else {
            break;
          }
        }

        if (
          window.scrollY + window.innerHeight >=
          document.documentElement.scrollHeight - 4
        ) {
          activeSection = sections[sections.length - 1];
        }

        const category = activeSection.dataset.drinkCategory;
        if (category) {
          setFilter((current) => (current === category ? current : category));
        }
      });
    };

    updateActiveCategory();
    window.addEventListener("scroll", updateActiveCategory, { passive: true });
    window.addEventListener("resize", updateActiveCategory);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", updateActiveCategory);
      window.removeEventListener("resize", updateActiveCategory);
    };
  }, [products.length, shopMode, tab]);

  useEffect(() => {
    if (tab !== "shop" || shopMode !== "drinks") return;
    const nav = drinkCategoryNavRef.current;
    const activeButton = nav?.querySelector<HTMLElement>(
      `[data-drink-category-tab="${filter}"]`,
    );
    if (!nav || !activeButton) return;

    const navRect = nav.getBoundingClientRect();
    const buttonRect = activeButton.getBoundingClientRect();
    if (buttonRect.top < navRect.top || buttonRect.bottom > navRect.bottom) {
      nav.scrollTo({
        top:
          activeButton.offsetTop - nav.clientHeight / 2 + activeButton.clientHeight / 2,
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
      });
    }
  }, [filter, shopMode, tab]);
  const normalizedGlobalQuery = globalQuery.trim().toLowerCase();
  const globalResults = normalizedGlobalQuery
    ? products
        .filter((product) =>
          `${product.name} ${product.nameZh} ${product.category} ${product.description} ${product.descriptionZh}`
            .toLowerCase()
            .includes(normalizedGlobalQuery),
        )
        .slice(0, 10)
    : [];

  const openProduct = (product: Product) => {
    setModalProduct(product);
    setCustom({
      size: productSizeEntries(product)[0]?.[0] ?? "One size",
      sugar: "50%",
      ice: "Less ice",
      toppings: [],
    });
  };

  const addProduct = () => {
    if (!modalProduct) return;
    const options =
      modalProduct.kind === "drink"
        ? custom
        : { size: undefined, sugar: undefined, ice: undefined, toppings: [] };
    const key = `${modalProduct.id}-${Date.now()}`;
    setCart([
      ...cart,
      { key, productId: modalProduct.id, quantity: 1, ...options },
    ]);
    setModalProduct(null);
  };

  const toggleSave = (id: string) =>
    setSaved(
      saved.includes(id) ? saved.filter((x) => x !== id) : [...saved, id],
    );
  const updateQty = (key: string, delta: number) =>
    setCart(
      cart
        .map((item) =>
          item.key === key
            ? { ...item, quantity: item.quantity + delta }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );

  const openAuth = (mode: "signin" | "signup", afterCheckout = false) => {
    setAuthMode(mode);
    setAuthError("");
    setPendingCheckout(afterCheckout);
  };

  const completeAuth = async (provider: AuthProvider) => {
    const email =
      provider === "password"
        ? authForm.email.trim().toLowerCase()
        : `${provider}.demo@kiyoyo.local`;
    if (
      provider === "password" &&
      (!email.includes("@") || authForm.password.length < 6)
    ) {
      setAuthError(
        lang === "zh"
          ? "请输入有效邮箱，密码至少 6 位。"
          : "Enter a valid email and a password of at least 6 characters.",
      );
      return;
    }
    try {
      const user = await signInMember(
        provider,
        authMode ?? "signin",
        email,
        authForm.password,
      );
      if (provider === "password" && authMode === "signup") {
        await sendMemberVerification();
      }
      const providerId = user.providerData[0]?.providerId;
      const actualProvider: AuthProvider =
        providerId === "google.com"
          ? "google"
          : providerId === "facebook.com"
            ? "facebook"
            : "password";
      setSession({
        id: user.uid,
        email: user.email ?? email,
        provider: actualProvider,
      } as AuthSession);
      const bootstrap = await apiFetch<{
        data: {
          nickname: string;
          gender: string | null;
          birth_year: number | null;
        };
      }>("/v1/auth/bootstrap", {
        method: "POST",
        body: JSON.stringify({
          nickname: user.displayName || email.split("@")[0],
          locale: lang,
        }),
      });
      setAuthMode(null);
      setAuthForm({ email: "", password: "" });
      if (!bootstrap.data.gender || !bootstrap.data.birth_year) {
        const suggested = bootstrap.data.nickname.replace(/[._-]/g, " ");
        setProfileForm({
          nickname: suggested.charAt(0).toUpperCase() + suggested.slice(1),
          gender: "",
          age: "",
        });
        setProfileModal(true);
      } else if (pendingCheckout) {
        setCheckout(true);
        setCheckoutChannel(null);
        setPendingCheckout(false);
      } else setPendingCheckout(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sign in failed";
      setAuthError(
        message.includes("operation-not-allowed")
          ? lang === "zh"
            ? "此社交登录正在等待 OAuth 配置，请先使用邮箱登录。"
            : "This social provider is awaiting OAuth setup. Please use email for now."
          : message,
      );
    }
  };

  const openProfile = () => {
    setProfileForm({
      nickname: profile.nickname,
      gender: profile.gender,
      age: profile.age,
    });
    setProfileModal(true);
  };

  const saveProfile = async () => {
    if (
      !profileForm.nickname.trim() ||
      !profileForm.age ||
      Number(profileForm.age) < 13 ||
      Number(profileForm.age) > 120
    )
      return;
    const genderMap: Record<Exclude<UserProfile["gender"], "">, string> = {
      Female: "FEMALE",
      Male: "MALE",
      "Non-binary": "NON_BINARY",
      "Prefer not to say": "PREFER_NOT_TO_SAY",
    };
    try {
      await apiFetch("/v1/me", {
        method: "PATCH",
        body: JSON.stringify({
          nickname: profileForm.nickname.trim(),
          gender: profileForm.gender ? genderMap[profileForm.gender] : null,
          birth_year: new Date().getFullYear() - Number(profileForm.age),
          locale: lang,
        }),
      });
      setProfile({
        ...profile,
        ...profileForm,
        nickname: profileForm.nickname.trim(),
      });
      setProfileModal(false);
      if (pendingCheckout) {
        setCheckout(true);
        setCheckoutChannel(null);
        setPendingCheckout(false);
      }
    } catch (error) {
      setAuthError(
        error instanceof Error ? error.message : "Profile could not be saved",
      );
    }
  };

  const openAddress = (address?: Address) => {
    setAddressForm(
      address
        ? { ...address }
        : {
            ...emptyAddress,
            id: `addr-${Date.now()}`,
            isDefault: profile.addresses.length === 0,
          },
    );
    setAddressError("");
    setAddressModal(true);
  };

  const saveAddress = async () => {
    if (
      !addressForm.label.trim() ||
      !addressForm.recipient.trim() ||
      !addressForm.phone.trim() ||
      !addressForm.area.trim() ||
      !addressForm.line1.trim()
    ) {
      setAddressError(
        lang === "zh"
          ? "请填写所有必填地址信息。"
          : "Complete all required address fields.",
      );
      return;
    }
    try {
      const exists = profile.addresses.some((a) => a.id === addressForm.id);
      const payload = {
        label: addressForm.label,
        contact_name: addressForm.recipient,
        phone_e164: addressForm.phone,
        area: addressForm.area,
        line1: addressForm.line1,
        city: "Nairobi",
        delivery_instructions: addressForm.instructions,
        make_default: addressForm.isDefault,
      };
      const response = await apiFetch<{
        data: {
          id: string;
          label: string;
          contact_name: string;
          phone_e164: string;
          area: string;
          line1: string;
          delivery_instructions?: string;
          is_default: boolean;
        };
      }>(exists ? `/v1/me/addresses/${addressForm.id}` : "/v1/me/addresses", {
        method: exists ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });
      const savedAddress: Address = {
        id: response.data.id,
        label: response.data.label,
        recipient: response.data.contact_name,
        phone: response.data.phone_e164,
        area: response.data.area,
        line1: response.data.line1,
        instructions: response.data.delivery_instructions,
        isDefault: response.data.is_default,
      };
      const normalized = profile.addresses.map((a) =>
        savedAddress.isDefault ? { ...a, isDefault: false } : a,
      );
      const addresses = exists
        ? normalized.map((a) => (a.id === addressForm.id ? savedAddress : a))
        : [...normalized, savedAddress];
      setProfile({ ...profile, addresses });
      setSelectedAddressId(savedAddress.id);
      setAddressModal(false);
      if (editingOrderId) {
        setOrders(
          orders.map((order) =>
            order.id === editingOrderId
              ? { ...order, addressId: savedAddress.id }
              : order,
          ),
        );
        setEditingOrderId(null);
      }
    } catch (error) {
      setAddressError(
        error instanceof Error ? error.message : "Address could not be saved",
      );
    }
  };

  const setDefaultAddress = async (id: string) => {
    try {
      await apiFetch(`/v1/me/addresses/${id}/default`, { method: "PUT" });
      setProfile({
        ...profile,
        addresses: profile.addresses.map((a) => ({
          ...a,
          isDefault: a.id === id,
        })),
      });
    } catch {
      /* keep current default */
    }
  };

  const beginCheckout = () => {
    if (hasUnavailable) return;
    if (!session) {
      openAuth("signin", true);
      return;
    }
    setSelectedAddressId(
      profile.addresses.find((a) => a.isDefault)?.id ||
        profile.addresses[0]?.id ||
        "",
    );
    setCheckoutError("");
    setCheckoutChannel(null);
    setCheckout(true);
  };

  const changeOrderAddress = (addressId: string) => {
    if (!editingOrderId) return;
    setOrders(
      orders.map((order) =>
        order.id === editingOrderId ? { ...order, addressId } : order,
      ),
    );
    setEditingOrderId(null);
  };

  const locate = () => {
    setLocating(true);
    setLocationError(false);
    if (!navigator.geolocation) {
      setLocationError(true);
      setLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const found = stores
          .filter((s) => s.lat && s.lng)
          .map((s) => ({
            id: s.id,
            km: haversineKm(coords.latitude, coords.longitude, s.lat!, s.lng!),
          }))
          .sort((a, b) => a.km - b.km);
        setDistances(Object.fromEntries(found.map((x) => [x.id, x.km])));
        if (found[0]) setStoreId(found[0].id);
        setLocating(false);
      },
      () => {
        setLocationError(true);
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 8000 },
    );
  };

  const placeOrder = async (channel: Order["channel"]) => {
    if (channel !== "Pickup" && !selectedAddressId) return;
    setCheckoutError("");
    setPlacingOrder(true);
    try {
      const response = await apiFetch<{
        data: {
          order_number: string;
          subtotal: number;
          discount: number;
          delivery_fee: number;
          total: number;
          created_at: string;
          coupon_code: string | null;
          pickup_qr_payload: string | null;
        };
      }>("/v1/checkouts", {
        method: "POST",
        headers: { "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({
          items: detailedCart.map((item) => ({
            product_id: item.product.apiId ?? item.product.id,
            quantity: item.quantity,
            customization: {
              size: item.size,
              sugar: item.sugar,
              ice: item.ice,
              toppings: item.toppings ?? [],
            },
          })),
          fulfillment: {
            type: channel.toUpperCase(),
            store_id: channel === "Shipping" ? undefined : storeId,
            address_id: channel === "Pickup" ? undefined : selectedAddressId,
          },
          coupon_code:
            selectedCoupon?.code || couponCodeInput.trim() || undefined,
          payment_method: { provider: "MOCK", token: "test_ok" },
        }),
      });
      const order: Order = {
        id: response.data.order_number,
        createdAt: response.data.created_at,
        status: "Placed",
        channel,
        storeId,
        subtotal: response.data.subtotal,
        discount: response.data.discount,
        deliveryFee: response.data.delivery_fee,
        couponCode: response.data.coupon_code ?? undefined,
        total: response.data.total,
        items: detailedCart.map(({ product, ...item }) => {
          const unitPrice =
            salePrice(product, item.size) +
            (item.toppings ?? []).reduce(
              (sum, toppingId) =>
                sum +
                salePrice(
                  catalog.find((candidate) => candidate.id === toppingId) ?? {
                    ...product,
                    price: 0,
                  },
                ),
              0,
            );
          return {
            ...item,
            productName: product.name,
            productNameZh: product.nameZh,
            productImage: product.image,
            unitPrice,
            lineTotal: unitPrice * item.quantity,
          };
        }),
        pickupCode: response.data.pickup_qr_payload ?? "NO-PICKUP",
        addressId: channel === "Pickup" ? undefined : selectedAddressId,
        addressSnapshot:
          channel === "Pickup"
            ? undefined
            : profile.addresses.find(
                (address) => address.id === selectedAddressId,
              ),
        storeSnapshot:
          channel === "Shipping" ? undefined : { ...selectedStore },
      };
      setOrders([order, ...orders]);
      setCart([]);
      setCheckout(false);
      setCheckoutChannel(null);
      setSelectedCouponId("");
      setCouponCodeInput("");
      setUserCoupons(await fetchMemberCoupons());
      setSuccess(order);
    } catch (error) {
      setCheckoutError(
        error instanceof Error ? error.message : "Order could not be placed",
      );
    } finally {
      setPlacingOrder(false);
    }
  };

  const openOrderDetails = (order: Order) => {
    setPickupQrError("");
    setSelectedOrder(order);
  };

  const restorePickupQr = async () => {
    if (!selectedOrder || selectedOrder.channel !== "Pickup") return;
    setPickupQrLoading(true);
    setPickupQrError("");
    try {
      const next = await reissuePickupToken(selectedOrder.id);
      const updatedOrder: Order = {
        ...selectedOrder,
        pickupCode: next.pickup_qr_payload,
        pickupCanReissue: true,
        pickupExpiresAt: next.expires_at,
        pickupFingerprint: next.token_fingerprint,
      };
      setOrders((current) =>
        current.map((order) =>
          order.id === updatedOrder.id ? updatedOrder : order,
        ),
      );
      setSelectedOrder(updatedOrder);
    } catch (error) {
      setPickupQrError(
        error instanceof Error
          ? error.message
          : lang === "zh"
            ? "无法生成取餐二维码。"
            : "Pickup QR could not be created.",
      );
    } finally {
      setPickupQrLoading(false);
    }
  };

  const go = (next: Tab) => {
    setTab(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const openShop = (mode: "drinks" | "goods", nextFilter?: string) => {
    setShopMode(mode);
    pendingDrinkCategoryRef.current =
      mode === "drinks" && nextFilter ? nextFilter : null;
    setFilter(nextFilter || (mode === "drinks" ? drinkCategoryOrder[0] : "Goods"));
    go("shop");
  };
  const jumpToDrinkCategory = (category: string) => {
    setFilter(category);
    document
      .getElementById(`drink-category-${drinkCategoryAnchor(category)}`)
      ?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "start",
      });
  };
  const campaigns = [
    {
      image: "/images/events/fruit-tea-campaign-v2.jpg",
      alt: "KIYOYO Fruit Ice Joy campaign",
      tag: lang === "zh" ? "01 / 果茶新作" : "01 / FRUIT DROP",
      title: lang === "zh" ? "热带果茶季" : "Fruit Rush",
      body:
        lang === "zh"
          ? "真实鲜果、冰爽茶底，装进内罗毕的阳光。"
          : "Real fruit, bright tea and a little Nairobi sun.",
      cta: lang === "zh" ? "选一杯果茶" : "Shop fruit teas",
      mode: "drinks" as const,
      filter: "Fruit Tea",
      motion: "fruit",
    },
    {
      image: "/images/events/event-3.jpg",
      alt: "KIYOYO sundae club campaign",
      tag: lang === "zh" ? "02 / 下午四点后" : "02 / AFTER FOUR",
      title: lang === "zh" ? "圣代俱乐部" : "Sundae Club",
      body:
        lang === "zh"
          ? "甜一点，今天就会更快乐一点。"
          : "A softer, sweeter finish to the day.",
      cta: lang === "zh" ? "挑选甜品" : "Pick a treat",
      mode: "drinks" as const,
      filter: "Dessert",
      motion: "sundae",
    },
    {
      image: "/images/goods/streetwear.png",
      alt: "KIYOYO streetwear campaign",
      tag: lang === "zh" ? "03 / 新品系列" : "03 / NEW DROP",
      title: lang === "zh" ? "穿上好心情" : "Wear the mood",
      body:
        lang === "zh"
          ? "把 KIYOYO 的红色能量带出门。"
          : "Take KIYOYO's red energy beyond the cup.",
      cta: lang === "zh" ? "逛潮流商品" : "Shop the drop",
      mode: "goods" as const,
      filter: "Fashion",
      motion: "street",
    },
  ];
  const activeCampaign = campaigns[bannerIndex];
  const runCampaign = () =>
    openShop(activeCampaign.mode, activeCampaign.filter);

  return (
    <div className="app-shell">
      <div className="top-strip">
        <span>NAIROBI, KENYA</span>
        <span>FRESHLY MADE · PLAYFULLY SERVED</span>
        <span>EST. WITH JOY</span>
      </div>
      <header className="site-header">
        <button
          className="store-button"
          onClick={() => setStoreModal(true)}
          aria-label={`${t.location}: ${selectedStore.area}`}
          title={`${t.location}: ${selectedStore.area}`}
        >
          <span>⌖</span>
          <span>
            <small>{t.location}</small>
            <strong>{selectedStore.area}⌄</strong>
          </span>
        </button>
        <button className="brand-button" onClick={() => go("home")}>
          <Logo />
        </button>
        <div className="header-actions">
          <button
            className="global-search-trigger"
            onClick={() => setGlobalSearchOpen(true)}
            aria-label={t.search}
          >
            <span className="search-mark" aria-hidden="true" />
            <strong>{lang === "zh" ? "搜索" : "Search"}</strong>
            <kbd>/</kbd>
          </button>
          <button
            className={`member-trigger ${session ? "has-session" : ""}`}
            onClick={() => (session ? go("account") : openAuth("signin"))}
            aria-label={
              session
                ? lang === "zh"
                  ? "打开用户中心"
                  : "Open account"
                : lang === "zh"
                  ? "登录"
                  : "Log in"
            }
          >
            <span aria-hidden="true">
              {session
                ? (profile.nickname || session.email).charAt(0).toUpperCase()
                : "○"}
            </span>
            <strong>
              {session
                ? profile.nickname || (lang === "zh" ? "账户" : "ACCOUNT")
                : lang === "zh"
                  ? "登录"
                  : "LOGIN"}
            </strong>
          </button>
          <button
            className="lang"
            onClick={() => setLang(lang === "en" ? "zh" : "en")}
            aria-label={lang === "en" ? "切换到中文" : "Switch to English"}
          >
            {lang === "en" ? "中文" : "EN"}
          </button>
          <button className="desktop-cart" onClick={() => go("cart")}>
            BAG <b>{cartCount}</b>
          </button>
        </div>
      </header>
      <nav className="desktop-nav">
        {(Object.keys(t.nav) as Tab[]).map((item) => (
          <button
            key={item}
            className={tab === item ? "active" : ""}
            onClick={() => (item === "shop" ? openShop("drinks") : go(item))}
          >
            {t.nav[item]}
            {item === "cart" && cartCount > 0 && <sup>{cartCount}</sup>}
          </button>
        ))}
      </nav>

      <main>
        {tab === "home" && (
          <>
            <section
              className="campaign-carousel"
              aria-roledescription="carousel"
              aria-label="KIYOYO campaigns"
              onMouseEnter={() => setBannerPointerPaused(true)}
              onMouseLeave={() => setBannerPointerPaused(false)}
              onFocusCapture={() => setBannerFocusPaused(true)}
              onBlurCapture={(event) => {
                if (
                  !event.currentTarget.contains(event.relatedTarget as Node)
                )
                  setBannerFocusPaused(false);
              }}
            >
              <div
                className={`campaign-stage motion-${activeCampaign.motion}`}
                key={bannerIndex}
              >
                <img
                  className="campaign-backdrop"
                  src={activeCampaign.image}
                  alt=""
                  aria-hidden="true"
                />
                <img
                  className="campaign-art"
                  src={activeCampaign.image}
                  alt={activeCampaign.alt}
                />
                <div className="campaign-motion" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                </div>
              </div>
              <button
                className="campaign-arrow previous"
                aria-label="Previous campaign"
                onClick={() =>
                  setBannerIndex(
                    (index) =>
                      (index + campaigns.length - 1) % campaigns.length,
                  )
                }
              >
                ←
              </button>
              <button
                className="campaign-arrow next"
                aria-label="Next campaign"
                onClick={() =>
                  setBannerIndex((index) => (index + 1) % campaigns.length)
                }
              >
                →
              </button>
              <div className="campaign-info">
                <span>{activeCampaign.tag}</span>
                <div>
                  <strong>{activeCampaign.title}</strong>
                  <small>{activeCampaign.body}</small>
                </div>
                <button onClick={runCampaign}>{activeCampaign.cta} ↗</button>
              </div>
              <div className="campaign-dots">
                {campaigns.map((campaign, index) => (
                  <button
                    key={campaign.tag}
                    className={bannerIndex === index ? "active" : ""}
                    aria-label={`Show campaign ${index + 1}`}
                    onClick={() => setBannerIndex(index)}
                  >
                    <i />
                  </button>
                ))}
              </div>
            </section>
            <div className="marquee">
              <div>
                BOBA · SOUFFLÉ · HAPPY THINGS · NAIROBI · BOBA · SOUFFLÉ · HAPPY
                THINGS · NAIROBI ·
              </div>
            </div>
            <section className="content-section">
              <SectionHead
                title={t.trending}
                action={t.seeAll}
                onAction={() => openShop("drinks")}
              />
              <div className="product-grid featured">
                {trendingProducts.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    lang={lang}
                    saved={saved.includes(p.id)}
                    onSave={() => toggleSave(p.id)}
                    onOpen={() => openProduct(p)}
                  />
                ))}
              </div>
            </section>
            <section className="story-band">
              <div className="story-photo">
                <img
                  src="/images/goods/streetwear.png"
                  alt="KIYOYO streetwear"
                />
              </div>
              <div className="story-copy">
                <span className="eyebrow">KIYOYO WORLD / 001</span>
                <h2>
                  {lang === "zh" ? "不只是一杯奶茶。" : "More than a cup."}
                </h2>
                <p>
                  {lang === "zh"
                    ? "我们把内罗毕的能量装进饮品、衣服、家居和每一个小小收藏。"
                    : "We bottle Nairobi energy into drinks, clothes, spaces and tiny objects worth keeping."}
                </p>
                <button
                  className="primary invert"
                  onClick={() => openShop("goods")}
                >
                  {t.shopDrop} →
                </button>
              </div>
            </section>
            <section className="content-section">
              <SectionHead
                title={t.goods}
                action={t.seeAll}
                onAction={() => openShop("goods")}
              />
              <div className="editorial-grid">
                {products
                  .filter((p) => p.kind === "goods")
                  .slice(0, 5)
                  .map((p, i) => (
                    <div className={`editorial-card e${i}`} key={p.id}>
                      <ProductCard
                        product={p}
                        lang={lang}
                        saved={saved.includes(p.id)}
                        onSave={() => toggleSave(p.id)}
                        onOpen={() => openProduct(p)}
                      />
                    </div>
                  ))}
              </div>
            </section>
          </>
        )}

        {tab === "shop" && (
          <section className="shop-page content-section">
            <div
              className="shop-mode-switch"
              role="tablist"
              aria-label={lang === "zh" ? "商城模式" : "Shop mode"}
            >
              <button
                role="tab"
                aria-selected={shopMode === "drinks"}
                className={shopMode === "drinks" ? "active" : ""}
                onClick={() => openShop("drinks")}
              >
                {lang === "zh" ? "饮品" : "Drinks"}
              </button>
              <button
                role="tab"
                aria-selected={shopMode === "goods"}
                className={shopMode === "goods" ? "active" : ""}
                onClick={() => openShop("goods")}
              >
                {lang === "zh" ? "好物" : "Goods"}
              </button>
            </div>
            {shopMode === "drinks" ? (
              <>
                <div className="drink-studio-hero">
                  <img
                    src="/images/events/drink-studio-kiyoyo-trend-v2.jpg"
                    alt="Three KIYOYO fruit drinks in a playful red, mango and cream campaign set"
                  />
                  <div className="drink-studio-copy">
                    <div className="drink-brand-lockup">
                      <Logo />
                    </div>
                    <h1>
                      {lang === "zh" ? (
                        <>
                          新鲜现做。
                          <br />
                          自在定制。
                        </>
                      ) : (
                        <>
                          Made fresh.
                          <br />
                          Made yours.
                        </>
                      )}
                    </h1>
                    <div>
                      <button
                        className="drink-hero-cta"
                        onClick={() =>
                          document
                            .getElementById("drink-menu")
                            ?.scrollIntoView({ behavior: "smooth" })
                        }
                      >
                        {lang === "zh" ? "选择饮品" : "Choose a drink"} →
                      </button>
                      <button
                        className="store-status"
                        onClick={() => setStoreModal(true)}
                      >
                        <i />
                        {selectedStore.area} ·{" "}
                        {lang === "zh" ? "15–20 分钟" : "15–20 min"}
                        <b>{lang === "zh" ? "更换" : "Change"}</b>
                      </button>
                    </div>
                  </div>
                </div>
                <div id="drink-menu" className="drink-vertical-menu">
                  <aside
                    ref={drinkCategoryNavRef}
                    className="drink-category-nav"
                    aria-label={lang === "zh" ? "饮品分类" : "Drink categories"}
                  >
                    <span>{lang === "zh" ? "菜单" : "MENU"}</span>
                    {drinkCategoryOrder.map((category) => (
                      <button
                        key={category}
                        data-drink-category-tab={category}
                        className={filter === category ? "active" : ""}
                        aria-pressed={filter === category}
                        onClick={() => jumpToDrinkCategory(category)}
                      >
                        <b>{lang === "zh" ? drinkCategoryZh[category] : category}</b>
                        <small>
                          {products.filter((product) => product.kind === "drink" && product.category === category).length}
                        </small>
                      </button>
                    ))}
                  </aside>
                  <section className="drink-menu-panel">
                    {drinkGroups.map((group, index) => (
                      <section
                        key={group.category}
                        id={`drink-category-${drinkCategoryAnchor(group.category)}`}
                        className="drink-category-section"
                        data-drink-category={group.category}
                        aria-labelledby={`drink-category-title-${drinkCategoryAnchor(group.category)}`}
                      >
                        <div className="drink-catalog-head">
                          <div>
                            <span>
                              {index === 0
                                ? lang === "zh"
                                  ? "本店菜单"
                                  : "YOUR STORE MENU"
                                : `${String(index + 1).padStart(2, "0")} / ${String(drinkGroups.length).padStart(2, "0")}`}
                            </span>
                            <h2
                              id={`drink-category-title-${drinkCategoryAnchor(group.category)}`}
                            >
                              {lang === "zh"
                                ? drinkCategoryZh[group.category]
                                : group.category}
                            </h2>
                          </div>
                          <strong>
                            {group.products.length}{" "}
                            {lang === "zh" ? "款可选" : "choices"}
                          </strong>
                        </div>
                        <div className="drink-menu-list">
                          {group.products.map((product) => (
                            <DrinkMenuCard
                              key={product.id}
                              product={product}
                              lang={lang}
                              saved={saved.includes(product.id)}
                              onSave={() => toggleSave(product.id)}
                              onOpen={() => openProduct(product)}
                            />
                          ))}
                        </div>
                      </section>
                    ))}
                  </section>
                </div>
              </>
            ) : (
              <>
                <div className="goods-shop-heading">
                  <span className="sticker">KIYOYO MARKET</span>
                  <h1>
                    {lang === "zh" ? "把快乐带回家。" : "Keep the good mood."}
                  </h1>
                  <p>
                    {lang === "zh"
                      ? "服饰、家居与可以收藏的小东西。"
                      : "Wear it, live with it, collect it."}
                  </p>
                </div>
                <div className="shop-tools">
                  <div className="filters">
                    {[
                      "Goods",
                      "Fashion",
                      "Home",
                      "Outdoor",
                      "Pets",
                      "Accessories",
                      "Collectibles",
                    ].map((f) => (
                      <button
                        key={f}
                        className={filter === f ? "active" : ""}
                        onClick={() => setFilter(f)}
                      >
                        {f === "Goods"
                          ? lang === "zh"
                            ? "全部商品"
                            : "All goods"
                          : f}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="product-grid">
                  {filteredProducts.map((p) => (
                    <ProductCard
                      key={p.id}
                      product={p}
                      lang={lang}
                      saved={saved.includes(p.id)}
                      onSave={() => toggleSave(p.id)}
                      onOpen={() => openProduct(p)}
                    />
                  ))}
                </div>
              </>
            )}
          </section>
        )}

        {tab === "collection" && (
          <section className="content-section collection-page">
            <div className="page-heading">
              <span className="sticker">♡ YOURS</span>
              <h1>{t.collectionTitle}</h1>
              <p>{t.collectionSub}</p>
            </div>
            {saved.length ? (
              <div className="product-grid">
                {products
                  .filter((p) => saved.includes(p.id))
                  .map((p) => (
                    <ProductCard
                      key={p.id}
                      product={p}
                      lang={lang}
                      saved
                      onSave={() => toggleSave(p.id)}
                      onOpen={() => openProduct(p)}
                    />
                  ))}
              </div>
            ) : (
              <div className="empty-state">
                <span>♡</span>
                <p>{t.emptySaved}</p>
                <button className="primary" onClick={() => go("shop")}>
                  {t.explore}
                </button>
              </div>
            )}
          </section>
        )}

        {tab === "cart" && (
          <section className="content-section cart-page">
            <div className="page-heading">
              <span className="sticker">{cartCount} ITEMS</span>
              <h1>{t.cartTitle}</h1>
            </div>
            {!cart.length ? (
              <div className="empty-state">
                <span>▱</span>
                <p>{t.emptyCart}</p>
                <button className="primary" onClick={() => go("shop")}>
                  {t.explore}
                </button>
              </div>
            ) : (
              <div className="cart-layout">
                <div className="cart-list">
                  {detailedCart.map((item) => (
                    <article
                      className={`cart-row ${item.product.active === false ? "unavailable" : ""}`}
                      key={item.key}
                    >
                      <img src={item.product.image} alt={item.product.name} />
                      <div className="cart-name">
                        <span className="eyebrow">
                          {item.product.active === false
                            ? lang === "zh"
                              ? "已下架"
                              : "Unavailable"
                            : item.product.kind === "drink"
                              ? t.drinks
                              : t.merch}
                        </span>
                        <h3>
                          {lang === "zh"
                            ? item.product.nameZh
                            : item.product.name}
                        </h3>
                        {item.product.kind === "drink" && (
                          <small>
                            {item.size} · {item.sugar} · {item.ice}
                            {item.toppings?.length
                              ? ` · ${item.toppings
                                  .map((toppingId) => {
                                    const topping = catalog.find(
                                      (product) => product.id === toppingId,
                                    );
                                    return lang === "zh"
                                      ? topping?.nameZh
                                      : topping?.name;
                                  })
                                  .filter(Boolean)
                                  .join(", ")}`
                              : ""}
                          </small>
                        )}
                        <strong>
                          {money(
                            salePrice(item.product, item.size) +
                              (item.toppings ?? []).reduce(
                                (sum, toppingId) =>
                                  sum +
                                  salePrice(
                                    catalog.find(
                                      (product) => product.id === toppingId,
                                    ) ?? { ...item.product, price: 0 },
                                  ),
                                0,
                              ),
                          )}
                        </strong>
                      </div>
                      <div className="qty">
                        <button onClick={() => updateQty(item.key, -1)}>
                          −
                        </button>
                        <span>{item.quantity}</span>
                        <button
                          onClick={() => updateQty(item.key, 1)}
                          disabled={item.product.active === false}
                        >
                          +
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
                <aside className="cart-summary">
                  <h2>{lang === "zh" ? "订单概要" : "Order summary"}</h2>
                  <div>
                    <span>{t.subtotal}</span>
                    <strong>{money(subtotal)}</strong>
                  </div>
                  <div>
                    <span>{lang === "zh" ? "配送费" : "Delivery"}</span>
                    <span>
                      {lang === "zh" ? "结账时计算" : "Calculated next"}
                    </span>
                  </div>
                  <button
                    className="primary full"
                    disabled={hasUnavailable}
                    onClick={beginCheckout}
                  >
                    {t.checkout} →
                  </button>
                  <small>
                    {hasUnavailable
                      ? lang === "zh"
                        ? "请移除已下架商品后结账。"
                        : "Remove unavailable items before checkout."
                      : session
                        ? t.mockNotice
                        : lang === "zh"
                          ? "结账前需要登录。"
                          : "Sign in is required at checkout."}
                  </small>
                </aside>
              </div>
            )}
          </section>
        )}

        {tab === "account" && (
          <section className="account-page content-section">
            {!session ? (
              <div className="account-auth">
                <div>
                  <span className="sticker">KIYOYO MEMBERS</span>
                  <h1>{t.authTitle}</h1>
                  <p>{t.authSub}</p>
                  <div>
                    <button
                      className="primary"
                      onClick={() => openAuth("signup")}
                    >
                      {t.createAccount} →
                    </button>
                    <button
                      className="text-button"
                      onClick={() => openAuth("signin")}
                    >
                      {t.signIn}
                    </button>
                  </div>
                </div>
                <aside>
                  <b>♡</b>
                  <strong>
                    {lang === "zh" ? "同步收藏" : "Save your favourites"}
                  </strong>
                  <span>
                    {lang === "zh"
                      ? "换设备也不会丢失"
                      : "Keep them across devices"}
                  </span>
                  <b>✦</b>
                  <strong>
                    {lang === "zh" ? "积分与奖励" : "Points & rewards"}
                  </strong>
                  <span>
                    {lang === "zh"
                      ? "每次快乐都有回报"
                      : "Get more from every order"}
                  </span>
                  <b>▤</b>
                  <strong>
                    {lang === "zh" ? "订单与地址" : "Orders & addresses"}
                  </strong>
                  <span>
                    {lang === "zh"
                      ? "快速结账、随时修改"
                      : "Check out and update faster"}
                  </span>
                </aside>
              </div>
            ) : (
              <>
                <div className="member-card">
                  <div>
                    <span>{t.member}</span>
                    <h1>{profile.nickname || t.memberHello}</h1>
                    <small>{t.points}</small>
                    <strong>2,480</strong>
                  </div>
                  <Logo />
                  <i>VIP</i>
                </div>
                <section className="profile-panel">
                  <div className="profile-head">
                    <div>
                      <span className="eyebrow">{t.profile}</span>
                      <h2>{profile.nickname}</h2>
                      <p>
                        {session.email} · {session.provider}
                      </p>
                    </div>
                    <button onClick={openProfile}>{t.editProfile} →</button>
                  </div>
                  <div className="profile-facts">
                    <div>
                      <span>{t.gender}</span>
                      <strong>{profile.gender || "—"}</strong>
                    </div>
                    <div>
                      <span>{t.age}</span>
                      <strong>{profile.age || "—"}</strong>
                    </div>
                    <div>
                      <span>
                        {lang === "zh" ? "登录方式" : "Sign-in method"}
                      </span>
                      <strong>{session.provider}</strong>
                    </div>
                  </div>
                  <div className="address-head">
                    <h3>{t.addressBook}</h3>
                    <button onClick={() => openAddress()}>
                      + {t.addAddress}
                    </button>
                  </div>
                  {profile.addresses.length ? (
                    <div className="address-grid">
                      {profile.addresses.map((address) => (
                        <article
                          key={address.id}
                          className={address.isDefault ? "default" : ""}
                        >
                          <div>
                            <strong>{address.label}</strong>
                            {address.isDefault && <em>{t.defaultAddress}</em>}
                          </div>
                          <p>
                            {address.recipient} · {address.phone}
                          </p>
                          <span>
                            {address.line1}, {address.area}
                          </span>
                          <div>
                            <button onClick={() => openAddress(address)}>
                              {t.editAddress}
                            </button>
                            {!address.isDefault && (
                              <button
                                onClick={() => setDefaultAddress(address.id)}
                              >
                                {lang === "zh" ? "设为默认" : "Make default"}
                              </button>
                            )}
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <button
                      className="empty-address"
                      onClick={() => openAddress()}
                    >
                      ⌖{" "}
                      <span>
                        {lang === "zh"
                          ? "添加默认配送地址，让下次结账更快。"
                          : "Add a default delivery address for faster checkout."}
                      </span>
                    </button>
                  )}
                </section>
                <div className="account-tabs" role="tablist">
                  <button
                    className={accountPanel === "coupons" ? "active" : ""}
                    onClick={() => setAccountPanel("coupons")}
                    role="tab"
                    aria-selected={accountPanel === "coupons"}
                  >
                    {t.coupons}
                  </button>
                  <button
                    className={accountPanel === "rewards" ? "active" : ""}
                    onClick={() => setAccountPanel("rewards")}
                    role="tab"
                    aria-selected={accountPanel === "rewards"}
                  >
                    {t.rewards}
                  </button>
                  <button
                    className={accountPanel === "history" ? "active" : ""}
                    onClick={() => setAccountPanel("history")}
                    role="tab"
                    aria-selected={accountPanel === "history"}
                  >
                    {t.history}
                  </button>
                </div>
                {accountPanel === "coupons" && (
                  <div className="coupon-grid" role="tabpanel">
                    {couponsLoading ? (
                      <div className="coupon-empty" aria-live="polite">
                        <strong>{lang === "zh" ? "正在加载优惠券…" : "Loading coupons…"}</strong>
                      </div>
                    ) : userCoupons.length ? (
                      userCoupons.map((coupon) => (
                        <article
                          key={coupon.userCouponId}
                          className={
                            coupon.walletStatus === "AVAILABLE"
                              ? coupon.discountType === "FREE_SIZE_UPGRADE"
                                ? "dark"
                                : ""
                              : "coupon-muted"
                          }
                        >
                          <b>
                            {coupon.discountType === "PERCENT"
                              ? `${coupon.discountValue}%`
                              : coupon.discountType === "FIXED"
                                ? money(coupon.discountValue)
                                : lang === "zh"
                                  ? "升杯"
                                  : "FREE"}
                          </b>
                          <div>
                            <strong>{lang === "zh" ? coupon.nameZh : coupon.nameEn}</strong>
                            <span>
                              {couponStatusLabel(coupon.walletStatus, lang)} · {lang === "zh" ? "有效期至" : "UNTIL"}{" "}
                              {new Date(coupon.expiresAt).toLocaleDateString(
                                lang === "zh" ? "zh-CN" : "en-KE",
                              )}
                            </span>
                          </div>
                          <button
                            disabled={coupon.walletStatus !== "AVAILABLE"}
                            onClick={() => {
                              setSelectedCouponId(coupon.userCouponId);
                              setCouponCodeInput("");
                              setTab(cart.length ? "cart" : "shop");
                            }}
                          >
                            {selectedCouponId === coupon.userCouponId
                              ? lang === "zh"
                                ? "已选择"
                                : "SELECTED"
                              : lang === "zh"
                                ? "使用"
                                : "USE"}
                          </button>
                        </article>
                      ))
                    ) : (
                      <div className="coupon-empty">
                        <strong>{lang === "zh" ? "暂时没有优惠券" : "No coupons yet"}</strong>
                        <span>
                          {lang === "zh"
                            ? "新发放的会员券会显示在这里。"
                            : "New member coupons will appear here."}
                        </span>
                      </div>
                    )}
                  </div>
                )}
                {accountPanel === "rewards" && (
                  <div className="rewards-panel" role="tabpanel">
                    <span>2,480</span>
                    <div>
                      <strong>{t.points}</strong>
                      <p>
                        {lang === "zh"
                          ? "再获得 520 积分即可解锁下一份会员奖励。"
                          : "Earn 520 more points to unlock your next member reward."}
                      </p>
                      <i>
                        <b style={{ width: "83%" }} />
                      </i>
                    </div>
                  </div>
                )}
                {accountPanel === "history" && (
                  <div className="account-history-panel" role="tabpanel">
                    <SectionHead title={t.history} />
                    {orders.length ? (
                      <div className="order-history">
                        {orders.map((o) => {
                          const orderAddress =
                            o.addressSnapshot ??
                            profile.addresses.find(
                              (address) => address.id === o.addressId,
                            );
                          return (
                            <article
                              key={o.id}
                              role="button"
                              tabIndex={0}
                              aria-label={`${t.viewOrder} ${o.id}`}
                              onClick={() => openOrderDetails(o)}
                              onKeyDown={(event) => {
                                if (
                                  event.key === "Enter" ||
                                  event.key === " "
                                ) {
                                  event.preventDefault();
                                  openOrderDetails(o);
                                }
                              }}
                            >
                              <div>
                                <strong>{o.id}</strong>
                                <span>
                                  {new Date(o.createdAt).toLocaleString(
                                    lang === "zh" ? "zh-CN" : "en-KE",
                                    {
                                      dateStyle: "medium",
                                      timeStyle: "short",
                                      timeZone: "Africa/Nairobi",
                                    },
                                  )}
                                </span>
                                {o.channel !== "Pickup" && (
                                  <small>
                                    {orderAddress
                                      ? `${orderAddress.label} · ${orderAddress.line1}`
                                      : lang === "zh"
                                        ? "未设置配送地址"
                                        : "No delivery address"}
                                  </small>
                                )}
                                <em>{t.viewOrder} →</em>
                              </div>
                              <div>
                                <span className="status">{o.status}</span>
                                <strong>{money(o.total)}</strong>
                                {o.channel !== "Pickup" &&
                                  o.status === "Placed" && (
                                    <button
                                      className="order-address-edit"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        setEditingOrderId(o.id);
                                      }}
                                    >
                                      {t.changeAddress}
                                    </button>
                                  )}
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="order-empty">{t.noOrders}</div>
                    )}
                  </div>
                )}
                <div className="account-links">
                  <a className="admin-link" href="/admin">
                    ⚙ {t.admin} →
                  </a>
                  <button
                    onClick={() => {
                      void signOutMember();
                      setSession(null);
                      go("home");
                    }}
                  >
                    {t.signOut}
                  </button>
                </div>
              </>
            )}
          </section>
        )}
      </main>

      {globalSearchOpen && (
        <div
          className="global-search-overlay"
          onMouseDown={(event) =>
            event.currentTarget === event.target && setGlobalSearchOpen(false)
          }
        >
          <section
            className="global-search-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="global-search-title"
          >
            <div className="global-search-head">
              <div>
                <Logo />
                <span id="global-search-title">
                  {lang === "zh" ? "搜索全部 KIYOYO" : "Search all KIYOYO"}
                </span>
              </div>
              <button
                onClick={() => setGlobalSearchOpen(false)}
                aria-label={lang === "zh" ? "关闭搜索" : "Close search"}
              >
                ×
              </button>
            </div>
            <label className="global-search-input">
              <span className="search-mark" aria-hidden="true" />
              <input
                autoFocus
                value={globalQuery}
                onChange={(event) => setGlobalQuery(event.target.value)}
                placeholder={t.search}
              />
              <kbd>ESC</kbd>
            </label>
            {!normalizedGlobalQuery ? (
              <div className="search-suggestions">
                <span>{lang === "zh" ? "热门搜索" : "Popular searches"}</span>
                <div>
                  {["Fruit Tea", "Milk Tea", "Fashion", "Accessories"].map(
                    (term) => (
                      <button key={term} onClick={() => setGlobalQuery(term)}>
                        {term}
                      </button>
                    ),
                  )}
                </div>
              </div>
            ) : globalResults.length ? (
              <div className="global-search-results">
                <div className="search-result-count">
                  <span>{lang === "zh" ? "搜索结果" : "Results"}</span>
                  <strong>{globalResults.length}</strong>
                </div>
                {globalResults.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => {
                      setGlobalSearchOpen(false);
                      setGlobalQuery("");
                      openProduct(product);
                    }}
                  >
                    <img src={product.image} alt="" />
                    <span>
                      <small>
                        {product.kind === "drink"
                          ? lang === "zh"
                            ? "饮品"
                            : "Drink"
                          : lang === "zh"
                            ? "商品"
                            : "Goods"}{" "}
                        · {product.category}
                      </small>
                      <strong>
                        {lang === "zh" ? product.nameZh : product.name}
                      </strong>
                    </span>
                    <b>{money(salePrice(product))}</b>
                  </button>
                ))}
              </div>
            ) : (
              <div className="global-search-empty">
                <strong>
                  {lang === "zh" ? "没有找到相关内容" : "No matches found"}
                </strong>
                <span>
                  {lang === "zh"
                    ? "试试饮品名称、品类或商品名称。"
                    : "Try a drink, category, or product name."}
                </span>
              </div>
            )}
          </section>
        </div>
      )}

      <nav className="mobile-nav">
        {(Object.keys(t.nav) as Tab[]).map((item) => (
          <button
            key={item}
            className={`${tab === item ? "active" : ""} ${item === "shop" ? "shop-entry" : ""}`}
            onClick={() => (item === "shop" ? openShop("drinks") : go(item))}
          >
            <NavIcon item={item} />
            <span>{t.nav[item]}</span>
            {item === "cart" && cartCount > 0 && <b>{cartCount}</b>}
          </button>
        ))}
      </nav>

      {modalProduct && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) =>
            e.currentTarget === e.target && setModalProduct(null)
          }
        >
          <div className="product-modal">
            <button
              className="modal-close"
              onClick={() => setModalProduct(null)}
            >
              ×
            </button>
            <div className={`modal-image ${modalProduct.kind === "drink" ? "drink-modal-image" : ""}`}>
              <img src={modalProduct.image} alt={modalProduct.name} />
              {(modalProduct.discountPercent || 0) > 0 ? (
                <span className="badge sale-badge">
                  −{modalProduct.discountPercent}%
                </span>
              ) : (
                modalProduct.badge && (
                  <span
                    className="badge"
                    data-tone={modalProduct.badgeTone || "red"}
                  >
                    {modalProduct.badge}
                  </span>
                )
              )}
            </div>
            <div className="modal-copy">
              <span className="eyebrow">{modalProduct.category}</span>
              <h2>{lang === "zh" ? modalProduct.nameZh : modalProduct.name}</h2>
              <p>
                {lang === "zh"
                  ? modalProduct.descriptionZh
                  : modalProduct.description}
              </p>
              <div className="modal-sale-price">
                <strong className="modal-price">
                  {money(salePrice(modalProduct, custom.size))}
                </strong>
                {(modalProduct.discountPercent || 0) > 0 && (
                  <del>{money(modalProduct.price)}</del>
                )}
              </div>
              {modalProduct.kind === "drink" && modalProduct.category !== "Add-ons" && (
                <div className="custom-options">
                  {productSizeEntries(modalProduct).length > 1 && (
                    <Option
                      title={t.size}
                      options={productSizeEntries(modalProduct).map(([size]) => size)}
                      value={custom.size}
                      onChange={(size) => setCustom({ ...custom, size })}
                    />
                  )}
                  {!["Sundae", "Soufflé"].includes(modalProduct.category) && (
                    <>
                      <Option
                        title={t.sugar}
                        options={["0%", "30%", "50%", "100%"]}
                        value={custom.sugar}
                        onChange={(sugar) => setCustom({ ...custom, sugar })}
                      />
                      <Option
                        title={t.ice}
                        options={["No ice", "Less ice", "Regular"]}
                        value={custom.ice}
                        onChange={(ice) => setCustom({ ...custom, ice })}
                      />
                      <div className="option-group">
                        <b>{t.toppings}</b>
                        <div>
                          {addOnProducts.map((top) => (
                        <button
                          key={top.id}
                          className={
                            custom.toppings.includes(top.id) ? "active" : ""
                          }
                          onClick={() =>
                            setCustom({
                              ...custom,
                              toppings: custom.toppings.includes(top.id)
                                ? custom.toppings.filter((x) => x !== top.id)
                                : [...custom.toppings, top.id],
                            })
                          }
                        >
                          {lang === "zh" ? top.nameZh : top.name} +{money(salePrice(top))}
                        </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
              <button className="primary full" onClick={addProduct}>
                {t.addCart} ·{" "}
                {money(
                  salePrice(modalProduct, custom.size) +
                    custom.toppings.reduce(
                      (sum, toppingId) =>
                        sum +
                        salePrice(
                          addOnProducts.find((product) => product.id === toppingId) ?? {
                            ...modalProduct,
                            price: 0,
                          },
                        ),
                      0,
                    ),
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {storeModal && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) =>
            e.currentTarget === e.target && setStoreModal(false)
          }
        >
          <div className="store-modal">
            <button
              className="modal-close"
              onClick={() => setStoreModal(false)}
            >
              ×
            </button>
            <span className="sticker">6 NAIROBI STORES</span>
            <h2>{t.storeTitle}</h2>
            <p>{t.storeSub}</p>
            <button
              className="locate-button"
              onClick={locate}
              disabled={locating}
            >
              ⌖ {locating ? "Locating…" : t.useLocation}
            </button>
            {locationError && (
              <small className="error">{t.locationDenied}</small>
            )}
            <GoogleStoreMap
              lang={lang}
              stores={stores}
              selectedStoreId={storeId}
              onSelect={setStoreId}
            />
            <div className="store-list">
              {stores.map((store, index) => (
                <button
                  key={store.id}
                  disabled={!store.lat}
                  className={store.id === storeId ? "selected" : ""}
                  onClick={() => {
                    setStoreId(store.id);
                    setStoreModal(false);
                  }}
                >
                  <span className="store-index">0{index + 1}</span>
                  <span>
                    <strong>{store.name}</strong>
                    <small>{store.address}</small>
                    <em>{store.verified ? store.phone : t.unverified}</em>
                  </span>
                  {distances[store.id] !== undefined && (
                    <b>
                      {distances[store.id].toFixed(1)} km
                      {Object.values(distances).sort((a, b) => a - b)[0] ===
                      distances[store.id]
                        ? ` · ${t.closest}`
                        : ""}
                    </b>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {checkout && (
        <div className="modal-backdrop">
          <div className="checkout-modal">
            <button
              className="modal-close"
              onClick={() => {
                setCheckout(false);
                setCheckoutChannel(null);
              }}
            >
              ×
            </button>
            <span className="sticker">TEST CHECKOUT</span>
            <h2>{t.checkoutTitle}</h2>
            <p>
              {selectedStore.name} · {money(subtotal)}
            </p>
            <div className="fulfilment-cards">
              <button
                className={checkoutChannel === "Pickup" ? "selected" : ""}
                onClick={() => setCheckoutChannel("Pickup")}
              >
                <i>⌂</i>
                <strong>{t.pickup}</strong>
                <span>{t.pickupNote}</span>
              </button>
              <button
                className={checkoutChannel === "Delivery" ? "selected" : ""}
                onClick={() => setCheckoutChannel("Delivery")}
              >
                <i>⌁</i>
                <strong>{t.delivery}</strong>
                <span>{t.deliveryNote}</span>
              </button>
              {detailedCart.some((x) => x.product.kind === "goods") && (
                <button
                  className={checkoutChannel === "Shipping" ? "selected" : ""}
                  onClick={() => setCheckoutChannel("Shipping")}
                >
                  <i>▧</i>
                  <strong>{t.shipping}</strong>
                  <span>Nairobi shipping demo</span>
                </button>
              )}
            </div>
            {checkoutChannel && (
              <section className="checkout-coupon">
                <div>
                  <h3>{lang === "zh" ? "优惠券" : "Coupon"}</h3>
                  {selectedCouponId && (
                    <button
                      type="button"
                      onClick={() => setSelectedCouponId("")}
                    >
                      {lang === "zh" ? "移除" : "Remove"}
                    </button>
                  )}
                </div>
                {userCoupons.some(
                  (coupon) => coupon.walletStatus === "AVAILABLE",
                ) && (
                  <label>
                    <span>{lang === "zh" ? "我的优惠券" : "My coupons"}</span>
                    <select
                      value={selectedCouponId}
                      onChange={(event) => {
                        setSelectedCouponId(event.target.value);
                        if (event.target.value) setCouponCodeInput("");
                        setCheckoutError("");
                      }}
                    >
                      <option value="">
                        {lang === "zh" ? "不使用会员券" : "No member coupon"}
                      </option>
                      {userCoupons
                        .filter((coupon) => coupon.walletStatus === "AVAILABLE")
                        .map((coupon) => (
                          <option
                            key={coupon.userCouponId}
                            value={coupon.userCouponId}
                          >
                            {lang === "zh" ? coupon.nameZh : coupon.nameEn} · {coupon.code}
                          </option>
                        ))}
                    </select>
                  </label>
                )}
                <label>
                  <span>{lang === "zh" ? "或输入优惠码" : "Or enter a promo code"}</span>
                  <input
                    value={couponCodeInput}
                    onChange={(event) => {
                      setCouponCodeInput(event.target.value.toUpperCase());
                      if (event.target.value) setSelectedCouponId("");
                      setCheckoutError("");
                    }}
                    placeholder="HAPPY20"
                    autoComplete="off"
                  />
                </label>
                {selectedCoupon && estimatedCouponDiscount === 0 && (
                  <small className="field-error">
                    {!selectedCouponMatchesFulfillment
                      ? lang === "zh"
                        ? "这张券不适用于当前履约方式。"
                        : "This coupon does not apply to this fulfilment method."
                      : couponEligibleSubtotal < selectedCoupon.minSpend
                        ? lang === "zh"
                          ? `适用商品需满 ${money(selectedCoupon.minSpend)}。`
                          : `Spend ${money(selectedCoupon.minSpend)} on eligible items.`
                        : lang === "zh"
                          ? "购物车中没有符合条件的商品。"
                          : "No eligible item in this cart."}
                  </small>
                )}
              </section>
            )}
            {checkoutChannel && checkoutChannel !== "Pickup" && (
              <section className="checkout-address">
                <div>
                  <h3>{t.chooseAddress}</h3>
                  <button onClick={() => openAddress()}>
                    + {t.addAddress}
                  </button>
                </div>
                {profile.addresses.length ? (
                  profile.addresses.map((address) => (
                    <label
                      key={address.id}
                      className={
                        selectedAddressId === address.id ? "selected" : ""
                      }
                    >
                      <input
                        type="radio"
                        name="checkout-address"
                        checked={selectedAddressId === address.id}
                        onChange={() => setSelectedAddressId(address.id)}
                      />
                      <span>
                        <strong>
                          {address.label}
                          {address.isDefault ? ` · ${t.defaultAddress}` : ""}
                        </strong>
                        <small>
                          {address.recipient} · {address.phone}
                          <br />
                          {address.line1}, {address.area}
                        </small>
                      </span>
                      <button
                        type="button"
                        onClick={() => openAddress(address)}
                      >
                        {t.editAddress}
                      </button>
                    </label>
                  ))
                ) : (
                  <button
                    className="empty-address compact"
                    onClick={() => openAddress()}
                  >
                    + {t.addAddress}
                  </button>
                )}
              </section>
            )}
            {checkoutChannel && (
              <>
                <section className="checkout-price-summary">
                  <span>{t.subtotal}<strong>{money(subtotal)}</strong></span>
                  {estimatedCouponDiscount > 0 && (
                    <span className="discount-row">
                      {lang === "zh" ? "优惠券抵扣" : "Coupon discount"}
                      <strong>−{money(estimatedCouponDiscount)}</strong>
                    </span>
                  )}
                  <span>
                    {lang === "zh" ? "配送费" : "Delivery"}
                    <strong>{money(checkoutDeliveryFee)}</strong>
                  </span>
                </section>
                {checkoutError && (
                  <p className="checkout-error" role="alert">{checkoutError}</p>
                )}
                <button
                  className="primary full checkout-submit"
                  disabled={
                    placingOrder ||
                    (checkoutChannel !== "Pickup" && !selectedAddressId) ||
                    Boolean(selectedCoupon && estimatedCouponDiscount === 0)
                  }
                  onClick={() => placeOrder(checkoutChannel)}
                >
                  {placingOrder
                    ? lang === "zh"
                      ? "正在提交…"
                      : "Placing order…"
                    : `${t.placeOrder} · ${money(estimatedCheckoutTotal)}`}
                </button>
              </>
            )}
            <small className="mock-note">ⓘ {t.mockNotice}</small>
          </div>
        </div>
      )}

      {authMode && (
        <div className="modal-backdrop">
          <div className="auth-modal">
            <button
              className="modal-close"
              onClick={() => {
                setAuthMode(null);
                setPendingCheckout(false);
              }}
            >
              ×
            </button>
            <Logo />
            <span className="auth-kicker">
              {authMode === "signup" ? t.createAccount : t.signIn}
            </span>
            <h2>{t.authTitle}</h2>
            <p>{t.authSub}</p>
            <button
              className="social google"
              onClick={() => completeAuth("google")}
            >
              <b>G</b>
              {t.continueGoogle}
            </button>
            <button
              className="social facebook"
              onClick={() => completeAuth("facebook")}
            >
              <b>f</b>
              {t.continueFacebook}
            </button>
            <div className="auth-divider">
              <span>{t.or}</span>
            </div>
            <label className="form-field">
              <span>{t.email}</span>
              <input
                type="email"
                value={authForm.email}
                onChange={(e) =>
                  setAuthForm({ ...authForm, email: e.target.value })
                }
                placeholder="you@example.com"
                autoComplete="email"
              />
            </label>
            <label className="form-field">
              <span>{t.password}</span>
              <input
                type="password"
                value={authForm.password}
                onChange={(e) =>
                  setAuthForm({ ...authForm, password: e.target.value })
                }
                placeholder="6+ characters"
                autoComplete={
                  authMode === "signup" ? "new-password" : "current-password"
                }
              />
            </label>
            {authError && <div className="form-error">{authError}</div>}
            <button
              className="primary full"
              onClick={() => completeAuth("password")}
            >
              {authMode === "signup" ? t.createAccount : t.signIn} →
            </button>
            <button
              className="auth-switch"
              onClick={() => {
                setAuthMode(authMode === "signup" ? "signin" : "signup");
                setAuthError("");
              }}
            >
              {authMode === "signup"
                ? lang === "zh"
                  ? "已有账号？登录"
                  : "Already a member? Sign in"
                : lang === "zh"
                  ? "还没有账号？注册"
                  : "New here? Create account"}
            </button>
            {authMode === "signin" && (
              <button
                className="auth-switch auth-reset"
                onClick={async () => {
                  const email = authForm.email.trim();
                  if (!email.includes("@")) {
                    setAuthError(
                      lang === "zh"
                        ? "请先输入需要重置密码的邮箱。"
                        : "Enter your email first to reset the password.",
                    );
                    return;
                  }
                  try {
                    await sendMemberPasswordReset(email);
                    setAuthError(
                      lang === "zh"
                        ? "密码重置邮件已发送。"
                        : "Password reset email sent.",
                    );
                  } catch (error) {
                    setAuthError(
                      error instanceof Error
                        ? error.message
                        : "Password reset could not be sent",
                    );
                  }
                }}
              >
                {lang === "zh" ? "忘记密码？" : "Forgot password?"}
              </button>
            )}
            <small className="auth-test">ⓘ {t.testAuth}</small>
          </div>
        </div>
      )}

      {profileModal && (
        <div className="modal-backdrop">
          <div className="profile-modal">
            <button
              className="modal-close"
              onClick={() => {
                setProfileModal(false);
                setPendingCheckout(false);
              }}
            >
              ×
            </button>
            <span className="sticker">MEMBER PROFILE</span>
            <h2>{profile.nickname ? t.editProfile : t.completeProfile}</h2>
            <p>{session?.email}</p>
            <label className="form-field">
              <span>{t.nickname}</span>
              <input
                value={profileForm.nickname}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, nickname: e.target.value })
                }
                placeholder={
                  lang === "zh"
                    ? "大家怎么称呼你？"
                    : "What should we call you?"
                }
              />
            </label>
            <div className="form-split">
              <label className="form-field">
                <span>{t.gender}</span>
                <select
                  value={profileForm.gender}
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      gender: e.target.value as UserProfile["gender"],
                    })
                  }
                >
                  <option value="">—</option>
                  <option>Female</option>
                  <option>Male</option>
                  <option>Non-binary</option>
                  <option>Prefer not to say</option>
                </select>
              </label>
              <label className="form-field">
                <span>{t.age}</span>
                <input
                  type="number"
                  min="13"
                  max="120"
                  value={profileForm.age}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, age: e.target.value })
                  }
                  placeholder="18+"
                />
              </label>
            </div>
            <small className="profile-privacy">
              {lang === "zh"
                ? "年龄与性别用于会员分析和更合适的推荐，不会公开展示。"
                : "Age and gender help with member insights and recommendations. They are never shown publicly."}
            </small>
            <button
              className="primary full"
              disabled={
                !profileForm.nickname.trim() || Number(profileForm.age) < 13
              }
              onClick={saveProfile}
            >
              {t.save} →
            </button>
          </div>
        </div>
      )}

      {addressModal && (
        <div className="modal-backdrop">
          <div className="address-modal">
            <button
              className="modal-close"
              onClick={() => setAddressModal(false)}
            >
              ×
            </button>
            <span className="sticker">NAIROBI DELIVERY</span>
            <h2>
              {addressForm.id &&
              profile.addresses.some((a) => a.id === addressForm.id)
                ? t.editAddress
                : t.addAddress}
            </h2>
            <div className="form-split">
              <label className="form-field">
                <span>{t.addressLabel}</span>
                <input
                  value={addressForm.label}
                  onChange={(e) =>
                    setAddressForm({ ...addressForm, label: e.target.value })
                  }
                />
              </label>
              <label className="form-field">
                <span>{t.recipient}</span>
                <input
                  value={addressForm.recipient}
                  onChange={(e) =>
                    setAddressForm({
                      ...addressForm,
                      recipient: e.target.value,
                    })
                  }
                />
              </label>
            </div>
            <label className="form-field">
              <span>{t.phone}</span>
              <input
                type="tel"
                value={addressForm.phone}
                onChange={(e) =>
                  setAddressForm({ ...addressForm, phone: e.target.value })
                }
                placeholder="+254 7•• ••• •••"
              />
            </label>
            <label className="form-field">
              <span>{t.area}</span>
              <input
                value={addressForm.area}
                onChange={(e) =>
                  setAddressForm({ ...addressForm, area: e.target.value })
                }
                placeholder="Kilimani, Westlands, CBD…"
              />
            </label>
            <label className="form-field">
              <span>{t.addressLine}</span>
              <input
                value={addressForm.line1}
                onChange={(e) =>
                  setAddressForm({ ...addressForm, line1: e.target.value })
                }
              />
            </label>
            <label className="form-field">
              <span>{t.instructions}</span>
              <textarea
                value={addressForm.instructions}
                onChange={(e) =>
                  setAddressForm({
                    ...addressForm,
                    instructions: e.target.value,
                  })
                }
              />
            </label>
            <label className="default-check">
              <input
                type="checkbox"
                checked={addressForm.isDefault}
                onChange={(e) =>
                  setAddressForm({
                    ...addressForm,
                    isDefault: e.target.checked,
                  })
                }
              />
              <span>{t.makeDefault}</span>
            </label>
            {addressError && <div className="form-error">{addressError}</div>}
            <button className="primary full" onClick={saveAddress}>
              {t.save} →
            </button>
          </div>
        </div>
      )}

      {editingOrderId && !addressModal && (
        <div className="modal-backdrop">
          <div className="order-address-modal">
            <button
              className="modal-close"
              onClick={() => setEditingOrderId(null)}
            >
              ×
            </button>
            <span className="sticker">ACTIVE ORDER</span>
            <h2>{t.changeAddress}</h2>
            <p>{editingOrderId}</p>
            {profile.addresses.map((address) => (
              <button
                key={address.id}
                onClick={() => changeOrderAddress(address.id)}
              >
                <strong>
                  {address.label}
                  {address.isDefault ? ` · ${t.defaultAddress}` : ""}
                </strong>
                <span>
                  {address.recipient} · {address.line1}, {address.area}
                </span>
              </button>
            ))}
            <button className="add-order-address" onClick={() => openAddress()}>
              + {t.addAddress}
            </button>
          </div>
        </div>
      )}

      {selectedOrder && (
        <div
          className="modal-backdrop order-detail-backdrop"
          onMouseDown={(event) =>
            event.currentTarget === event.target && setSelectedOrder(null)
          }
        >
          <section
            className="order-detail-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="order-detail-title"
          >
            <button
              className="modal-close"
              onClick={() => setSelectedOrder(null)}
              aria-label={t.close}
            >
              ×
            </button>
            <div className="order-detail-heading">
              <div>
                <span className="sticker">{selectedOrder.status}</span>
                <h2 id="order-detail-title">{t.orderDetails}</h2>
                <strong>{selectedOrder.id}</strong>
              </div>
              <span>{selectedOrder.channel}</span>
            </div>
            <p className="order-detail-date">
              {new Date(selectedOrder.createdAt).toLocaleString(
                lang === "zh" ? "zh-CN" : "en-KE",
                {
                  dateStyle: "full",
                  timeStyle: "short",
                  timeZone: "Africa/Nairobi",
                },
              )}
            </p>

            {selectedOrder.channel === "Pickup" ? (
              <section className="order-pickup-card">
                <div>
                  <span>{t.pickupAt}</span>
                  <strong>
                    {selectedOrderStore?.name ??
                      (lang === "zh" ? "KIYOYO 门店" : "KIYOYO store")}
                  </strong>
                  <p>{selectedOrderStore?.address}</p>
                </div>
                {selectedOrder.pickupCode !== "NO-PICKUP" &&
                !["Completed", "Cancelled"].includes(selectedOrder.status) ? (
                  <div className="order-pickup-code">
                    <PickupQR code={selectedOrder.pickupCode} />
                    <code>{selectedOrder.pickupCode}</code>
                    <small>{t.qrHelp}</small>
                  </div>
                ) : selectedOrder.pickupCanReissue &&
                  !["Completed", "Cancelled"].includes(
                    selectedOrder.status,
                  ) ? (
                  <div className="order-reissue-code">
                    <b>▦</b>
                    <strong>{t.restorePickupCode}</strong>
                    <p>{t.restorePickupHelp}</p>
                    {pickupQrError && <small>{pickupQrError}</small>}
                    <button
                      className="primary"
                      disabled={pickupQrLoading}
                      onClick={restorePickupQr}
                    >
                      {pickupQrLoading
                        ? t.restoringCode
                        : `${t.restorePickupCode} →`}
                    </button>
                  </div>
                ) : (
                  <div className="order-closed-code">
                    <b>✓</b>
                    <span>
                      {selectedOrder.status === "Completed"
                        ? lang === "zh"
                          ? "订单已核销"
                          : "Pickup completed"
                        : lang === "zh"
                          ? "二维码当前不可用"
                          : "Pickup code unavailable"}
                    </span>
                  </div>
                )}
              </section>
            ) : (
              <section className="order-delivery-card">
                <span>{t.deliverTo}</span>
                <strong>
                  {selectedOrderAddress?.label ??
                    (lang === "zh" ? "配送地址" : "Delivery address")}
                </strong>
                {selectedOrderAddress ? (
                  <p>
                    {selectedOrderAddress.recipient} ·{" "}
                    {selectedOrderAddress.phone}
                    <br />
                    {selectedOrderAddress.line1}, {selectedOrderAddress.area}
                  </p>
                ) : (
                  <p>{lang === "zh" ? "地址信息不可用" : "Address unavailable"}</p>
                )}
                {selectedOrder.status === "Placed" && (
                  <button
                    onClick={() => {
                      setSelectedOrder(null);
                      setEditingOrderId(selectedOrder.id);
                    }}
                  >
                    {t.changeAddress} →
                  </button>
                )}
              </section>
            )}

            <section className="order-detail-items">
              <h3>{t.orderedItems}</h3>
              {selectedOrder.items.map((item) => {
                const product = catalog.find(
                  (candidate) => candidate.id === item.productId,
                );
                const itemName =
                  lang === "zh"
                    ? (item.productNameZh ?? product?.nameZh ?? item.productId)
                    : (item.productName ?? product?.name ?? item.productId);
                const options = [
                  item.size,
                  item.sugar,
                  item.ice,
                  ...(item.toppings ?? []),
                ].filter(Boolean);
                const lineTotal =
                  item.lineTotal ??
                  (item.unitPrice ?? (product ? salePrice(product) : 0)) *
                    item.quantity;
                return (
                  <article key={item.key}>
                    {(item.productImage ?? product?.image) && (
                      <img
                        src={item.productImage ?? product?.image}
                        alt=""
                      />
                    )}
                    <div>
                      <strong>{itemName}</strong>
                      {options.length > 0 && <span>{options.join(" · ")}</span>}
                      <small>× {item.quantity}</small>
                    </div>
                    <b>{money(lineTotal)}</b>
                  </article>
                );
              })}
            </section>

            <div className="order-detail-total">
              <span>
                {selectedOrder.subtotal != null && (
                  <small>{t.subtotal} · {money(selectedOrder.subtotal)}</small>
                )}
                {(selectedOrder.discount ?? 0) > 0 && (
                  <small>
                    {lang === "zh" ? "优惠券" : "Coupon"}{" "}
                    {selectedOrder.couponCode ? `· ${selectedOrder.couponCode} ` : ""}
                    −{money(selectedOrder.discount ?? 0)}
                  </small>
                )}
                {t.orderTotal}
              </span>
              <strong>{money(selectedOrder.total)}</strong>
            </div>
            <button
              className="primary full order-detail-close"
              onClick={() => setSelectedOrder(null)}
            >
              {t.close}
            </button>
          </section>
        </div>
      )}

      {success && (
        <div className="modal-backdrop">
          <div className="success-modal">
            <span className="success-pop">✓</span>
            <h2>{t.success}</h2>
            <strong className="order-number">{success.id}</strong>
            {success.channel === "Pickup" ? (
              <>
                <PickupQR code={success.pickupCode} />
                <code>{success.pickupCode}</code>
                <p>{t.qrHelp}</p>
              </>
            ) : (
              <>
                <div className="delivery-success">⌁</div>
                <p>
                  {success.channel} ·{" "}
                  {
                    profile.addresses.find((a) => a.id === success.addressId)
                      ?.line1
                  }
                </p>
              </>
            )}
            <button
              className="primary full"
              onClick={() => {
                setSuccess(null);
                go("home");
              }}
            >
              {t.done}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
