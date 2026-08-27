"use client";
import { useEffect, useRef, useState } from "react";
import { haversineKm, stores } from "../data";
import { drinkCategoryOrder } from "../menu";
import {
  addOnsPrice,
  resolveProductTag,
  salePrice,
  useCatalog,
  useProductTags,
} from "../catalog";
import {
  apiFetch,
  fetchMemberCoupons,
  fetchMemberFavorites,
  fetchMemberOrders,
  pickupTokenFingerprint,
  removeMemberFavorite,
  reissuePickupToken,
  saveMemberFavorite,
} from "../platform";
import { useCustomerAuth } from "../auth/useCustomerAuth";
import {
  FAVORITE_OWNER_KEY,
  GUEST_FAVORITE_OWNER,
  memberFavoriteOwner,
  planFavoriteSync,
  shouldClearFavoritesOnSignOut,
} from "../auth/favoriteOwnership";
import { shouldClearMemberData } from "../auth/state";
import {
  categorySlug,
  drinkCategoryAnchor,
  drinkMenuTagRank,
  emptyAddress,
  emptyProfile,
} from "./customer/core/foundation";
import { productSizeEntries } from "./customer/shared/primitives";
import { useStoredState } from "./customer/core/useStoredState";
import { copy } from "./customer/core/copy";
import {
  customerTabFromPath,
  customerTabPath,
} from "./customer/core/routes";
import { HomeView } from "./customer/home/HomeView";
import { ShopView } from "./customer/shop/ShopView";
import { CartView } from "./customer/cart/CartView";
import { AccountView } from "./customer/account/AccountView";
import { GlobalSearchDialog } from "./customer/shell/GlobalSearchDialog";
import { ProductDialog } from "./customer/shop/ProductDialog";
import { StoreDialog } from "./customer/fulfillment/StoreDialog";
import { CheckoutDialog } from "./customer/cart/CheckoutDialog";
import { AuthDialog } from "./customer/auth/AuthDialog";
import { PhoneVerificationGate } from "./customer/auth/PhoneVerificationGate";
import { ProfileDialog } from "./customer/account/ProfileDialog";
import { AddressDialog } from "./customer/account/AddressDialog";
import { OrderAddressDialog } from "./customer/orders/OrderAddressDialog";
import { OrderDetailDialog } from "./customer/orders/OrderDetailDialog";
import { OrderSuccessDialog } from "./customer/orders/OrderSuccessDialog";
import {
  CustomerHeader,
  DesktopNavigation,
  MobileNavigation,
} from "./customer/shell/navigation";
import type {
  Address,
  CartItem,
  Lang,
  Order,
  Product,
  Tab,
  UserCoupon,
  UserProfile,
} from "../types";

export default function KiyoyoApp({
  initialTab = "home",
}: {
  initialTab?: Tab;
}) {
  const [lang, setLang] = useStoredState<Lang>("kiyoyo-lang", "en");
  const customerAuth = useCustomerAuth(lang);
  const session = customerAuth.session;
  const [catalog] = useCatalog();
  const [productTags] = useProductTags();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [storeId, setStoreId] = useStoredState("kiyoyo-store", "kilimani");
  const [cart, setCart] = useStoredState<CartItem[]>("kiyoyo-cart", []);
  const [saved, setSaved] = useStoredState<string[]>("kiyoyo-saved", [
    "g1",
    "d6",
  ]);
  const savedRef = useRef(saved);
  const favoriteSyncMemberRef = useRef<string | null>(null);
  const [orders, setOrders] = useStoredState<Order[]>("kiyoyo-orders", []);
  const ordersRef = useRef<Order[]>(orders);
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
    addOns: [] as string[],
  });
  const [authMode, setAuthMode] = useState<"signin" | "signup" | null>(null);
  const [phoneVerificationGate, setPhoneVerificationGate] = useState(false);
  const [profileModal, setProfileModal] = useState(false);
  const [profileError, setProfileError] = useState("");
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

  useEffect(() => {
    savedRef.current = saved;
  }, [saved]);

  useEffect(() => {
    const handlePopState = () => {
      const nextTab = customerTabFromPath(window.location.pathname);
      if (nextTab) setTab(nextTab);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (
      customerAuth.phase !== "authenticated" ||
      !session ||
      catalog.length === 0 ||
      favoriteSyncMemberRef.current === session.memberId
    )
      return;
    favoriteSyncMemberRef.current = session.memberId;
    let cancelled = false;
    void (async () => {
      const plan = planFavoriteSync({
        owner: window.localStorage.getItem(FAVORITE_OWNER_KEY),
        memberId: session.memberId,
        localIds: savedRef.current,
      });
      if (plan.resetLocal) {
        savedRef.current = [];
        setSaved([]);
      }
      window.localStorage.setItem(FAVORITE_OWNER_KEY, plan.targetOwner);
      const localProducts = plan.uploadIds
        .map((id) => catalog.find((product) => product.id === id))
        .filter((product): product is Product => Boolean(product?.apiId));
      try {
        await Promise.all(
          localProducts.map((product) => saveMemberFavorite(product.apiId!)),
        );
        const remoteProducts = await fetchMemberFavorites();
        if (cancelled) return;
        const merged = [
          ...new Set([
            ...plan.uploadIds,
            ...remoteProducts.map((product) => product.id),
          ]),
        ];
        savedRef.current = merged;
        setSaved(merged);
      } catch {
        favoriteSyncMemberRef.current = null;
        /* Local favourites remain available while remote sync is unavailable. */
      }
    })();
    return () => {
      cancelled = true;
      if (favoriteSyncMemberRef.current === session.memberId) {
        favoriteSyncMemberRef.current = null;
      }
    };
  }, [catalog, customerAuth.phase, session, setSaved]);

  useEffect(() => {
    if (!shouldClearMemberData(customerAuth.phase)) return;
    favoriteSyncMemberRef.current = null;
    const owner = window.localStorage.getItem(FAVORITE_OWNER_KEY);
    if (shouldClearFavoritesOnSignOut(owner)) {
      savedRef.current = [];
      setSaved([]);
      window.localStorage.setItem(
        FAVORITE_OWNER_KEY,
        GUEST_FAVORITE_OWNER,
      );
    }
  }, [customerAuth.phase, setSaved]);

  useEffect(() => {
    if (shouldClearMemberData(customerAuth.phase)) {
      void Promise.resolve().then(() => {
        setOrders([]);
        setProfile(emptyProfile);
        setUserCoupons([]);
        setCouponsLoading(false);
        setSelectedCouponId("");
      });
      return;
    }
    if (customerAuth.phase !== "authenticated" || !session) return;
    let cancelled = false;
    void (async () => {
      await Promise.resolve();
      if (cancelled) return;
      setCouponsLoading(true);
      try {
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
        if (cancelled) return;
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
        if (!cancelled) setCouponsLoading(false);
        /* preserve the local fallback if the API is temporarily unavailable */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [customerAuth.phase, session, setOrders, setProfile]);

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
          addOnsPrice(item.product, item) +
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
        addOnsPrice(item.product, item) +
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
    // 默认选项:有银豹口味组时取组内默认值(50% 糖 / 50% 冰),否则回退固定值
    const tastes = product.pospalTastes ?? [];
    const sugarOptions = tastes
      .filter((taste) => taste.packageName === "sugar")
      .map((taste) => taste.attributeName);
    const iceOptions = tastes
      .filter((taste) => taste.packageName === "ICE")
      .map((taste) => taste.attributeName);
    setCustom({
      size: productSizeEntries(product)[0]?.[0] ?? "One size",
      sugar: sugarOptions.includes("50%sugar")
        ? "50%sugar"
        : (sugarOptions[0] ?? "50%"),
      ice: iceOptions.includes("50%iced")
        ? "50%iced"
        : (iceOptions[0] ?? "Less ice"),
      toppings: [],
      addOns: [],
    });
  };

  const addProduct = () => {
    if (!modalProduct) return;
    const options =
      modalProduct.kind === "drink"
        ? custom
        : { size: undefined, sugar: undefined, ice: undefined, toppings: [], addOns: [] };
    const key = `${modalProduct.id}-${Date.now()}`;
    setCart([
      ...cart,
      { key, productId: modalProduct.id, quantity: 1, ...options },
    ]);
    setModalProduct(null);
  };

  const toggleSave = (id: string) => {
    const removing = saved.includes(id);
    setSaved(removing ? saved.filter((x) => x !== id) : [...saved, id]);
    const productId = catalog.find((product) => product.id === id)?.apiId;
    if (session && productId) {
      window.localStorage.setItem(
        FAVORITE_OWNER_KEY,
        memberFavoriteOwner(session.memberId),
      );
      void (removing
        ? removeMemberFavorite(productId)
        : saveMemberFavorite(productId)
      ).catch(() => undefined);
    }
    if (!session) {
      window.localStorage.setItem(
        FAVORITE_OWNER_KEY,
        GUEST_FAVORITE_OWNER,
      );
    }
  };
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
    customerAuth.clearError();
    setPendingCheckout(afterCheckout);
  };

  const completeAuth = (nextSession: typeof session) => {
    if (!nextSession) return;
    setAuthMode(null);
    if (!nextSession.phoneVerified) {
      setPhoneVerificationGate(true);
      return;
    }
    if (!pendingCheckout) return;
    setCheckout(true);
    setCheckoutChannel(null);
    setPendingCheckout(false);
  };

  const openProfile = () => {
    setProfileError("");
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
      (profileForm.age &&
        (Number(profileForm.age) < 13 || Number(profileForm.age) > 120))
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
          birth_year: profileForm.age
            ? new Date().getFullYear() - Number(profileForm.age)
            : null,
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
      setProfileError(
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
    if (!session.phoneVerified) {
      setPendingCheckout(true);
      setPhoneVerificationGate(true);
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
              add_ons: item.addOns ?? [],
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
            addOnsPrice(product, item) +
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
    const path = customerTabPath(next);
    if (window.location.pathname !== path) {
      window.history.pushState({}, "", path);
    }
    window.scrollTo({
      top: 0,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
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
      image:
        products.find((product) => product.id === "g1")?.image ??
        products.find((product) => product.kind === "goods")?.image ??
        "",
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
      <CustomerHeader
        t={t}
        lang={lang}
        storeArea={selectedStore.area}
        session={session}
        profile={profile}
        cartCount={cartCount}
        onOpenStore={() => setStoreModal(true)}
        onHome={() => go("home")}
        onSearch={() => setGlobalSearchOpen(true)}
        onMember={() => (session ? go("account") : openAuth("signin"))}
        onToggleLanguage={() => setLang(lang === "en" ? "zh" : "en")}
        onCart={() => go("cart")}
      />
      <DesktopNavigation
        t={t}
        tab={tab}
        cartCount={cartCount}
        onNavigate={(item) =>
          item === "shop" ? openShop("drinks") : go(item)
        }
      />

      <main>
        {tab === "home" && (
          <HomeView
            t={t}
            lang={lang}
            campaigns={campaigns}
            activeCampaign={activeCampaign}
            bannerIndex={bannerIndex}
            setBannerIndex={setBannerIndex}
            setBannerPointerPaused={setBannerPointerPaused}
            setBannerFocusPaused={setBannerFocusPaused}
            runCampaign={runCampaign}
            openShop={openShop}
            trendingProducts={trendingProducts}
            products={products}
            saved={saved}
            toggleSave={toggleSave}
            openProduct={openProduct}
          />
        )}

        {tab === "shop" && (
          <ShopView
            lang={lang}
            shopMode={shopMode}
            openShop={openShop}
            setStoreModal={setStoreModal}
            storeArea={selectedStore.area}
            drinkCategoryNavRef={drinkCategoryNavRef}
            filter={filter}
            products={products}
            jumpToDrinkCategory={jumpToDrinkCategory}
            drinkGroups={drinkGroups}
            saved={saved}
            toggleSave={toggleSave}
            openProduct={openProduct}
            setFilter={setFilter}
            filteredProducts={filteredProducts}
          />
        )}

        {tab === "cart" && (
          <CartView
            t={t}
            lang={lang}
            cart={cart}
            cartCount={cartCount}
            detailedCart={detailedCart}
            catalog={catalog}
            updateQty={updateQty}
            subtotal={subtotal}
            hasUnavailable={hasUnavailable}
            beginCheckout={beginCheckout}
            session={session}
            onExplore={() => go("shop")}
            saved={saved}
            products={products}
            toggleSave={toggleSave}
            openProduct={openProduct}
          />
        )}

        {tab === "account" && (
          <AccountView
            t={t}
            lang={lang}
            session={session}
            profile={profile}
            openAuth={openAuth}
            openProfile={openProfile}
            openAddress={openAddress}
            setDefaultAddress={setDefaultAddress}
            accountPanel={accountPanel}
            setAccountPanel={setAccountPanel}
            couponsLoading={couponsLoading}
            userCoupons={userCoupons}
            selectedCouponId={selectedCouponId}
            setSelectedCouponId={setSelectedCouponId}
            setCouponCodeInput={setCouponCodeInput}
            cart={cart}
            orders={orders}
            openOrderDetails={openOrderDetails}
            setEditingOrderId={setEditingOrderId}
            signOut={customerAuth.signOut}
            authBusy={customerAuth.busy}
            authError={customerAuth.error}
            linkProvider={customerAuth.linkProvider}
            linkPassword={customerAuth.linkPassword}
            unlinkProvider={customerAuth.unlinkProvider}
            openPhoneVerification={() => {
              customerAuth.clearError();
              setPhoneVerificationGate(true);
            }}
            go={go}
          />
        )}
      </main>

      {globalSearchOpen && (
        <GlobalSearchDialog
          lang={lang}
          t={t}
          globalQuery={globalQuery}
          setGlobalQuery={setGlobalQuery}
          normalizedGlobalQuery={normalizedGlobalQuery}
          globalResults={globalResults}
          setGlobalSearchOpen={setGlobalSearchOpen}
          openProduct={openProduct}
        />
      )}

      <MobileNavigation
        t={t}
        tab={tab}
        cartCount={cartCount}
        onNavigate={(item) =>
          item === "shop" ? openShop("drinks") : go(item)
        }
      />

      {modalProduct && (
        <ProductDialog
          modalProduct={modalProduct}
          setModalProduct={setModalProduct}
          lang={lang}
          t={t}
          custom={custom}
          setCustom={setCustom}
          addOnProducts={addOnProducts}
          addProduct={addProduct}
        />
      )}

      {storeModal && (
        <StoreDialog
          t={t}
          lang={lang}
          setStoreModal={setStoreModal}
          locate={locate}
          locating={locating}
          locationError={locationError}
          storeId={storeId}
          setStoreId={setStoreId}
          distances={distances}
        />
      )}

      {checkout && (
        <CheckoutDialog
          setCheckout={setCheckout}
          setCheckoutChannel={setCheckoutChannel}
          selectedStore={selectedStore}
          subtotal={subtotal}
          t={t}
          lang={lang}
          checkoutChannel={checkoutChannel}
          detailedCart={detailedCart}
          userCoupons={userCoupons}
          selectedCouponId={selectedCouponId}
          setSelectedCouponId={setSelectedCouponId}
          couponCodeInput={couponCodeInput}
          setCouponCodeInput={setCouponCodeInput}
          setCheckoutError={setCheckoutError}
          selectedCoupon={selectedCoupon}
          estimatedCouponDiscount={estimatedCouponDiscount}
          selectedCouponMatchesFulfillment={selectedCouponMatchesFulfillment}
          couponEligibleSubtotal={couponEligibleSubtotal}
          profile={profile}
          openAddress={openAddress}
          selectedAddressId={selectedAddressId}
          setSelectedAddressId={setSelectedAddressId}
          checkoutDeliveryFee={checkoutDeliveryFee}
          checkoutError={checkoutError}
          placingOrder={placingOrder}
          placeOrder={placeOrder}
          estimatedCheckoutTotal={estimatedCheckoutTotal}
        />
      )}

      {authMode && (
        <AuthDialog
          initialMode={authMode}
          t={t}
          busy={customerAuth.busy}
          error={customerAuth.error}
          clearError={customerAuth.clearError}
          onAuthenticate={customerAuth.signIn}
          onPasswordReset={customerAuth.sendPasswordReset}
          onSuccess={completeAuth}
          onClose={() => {
            setAuthMode(null);
            setPendingCheckout(false);
          }}
        />
      )}

      {phoneVerificationGate && session && (
        <PhoneVerificationGate
          t={t}
          busy={customerAuth.busy}
          error={customerAuth.error}
          onClearError={customerAuth.clearError}
          onReset={() => {
            customerAuth.resetPhoneVerification();
            customerAuth.clearError();
          }}
          onClose={() => {
            customerAuth.resetPhoneVerification();
            customerAuth.clearError();
            setPhoneVerificationGate(false);
            setPendingCheckout(false);
          }}
          onSend={customerAuth.sendPhoneCode}
          onConfirm={async (code) => {
            const refreshed = await customerAuth.confirmPhoneCode(code);
            if (!refreshed?.phoneVerified) return refreshed;
            setPhoneVerificationGate(false);
            if (pendingCheckout) {
              setCheckout(true);
              setCheckoutChannel(null);
              setPendingCheckout(false);
            }
            return refreshed;
          }}
        />
      )}

      {profileModal && (
        <ProfileDialog
          setProfileModal={setProfileModal}
          setPendingCheckout={setPendingCheckout}
          profile={profile}
          t={t}
          session={session}
          profileForm={profileForm}
          setProfileForm={setProfileForm}
          lang={lang}
          saveProfile={saveProfile}
          profileError={profileError}
        />
      )}

      {addressModal && (
        <AddressDialog
          setAddressModal={setAddressModal}
          addressForm={addressForm}
          setAddressForm={setAddressForm}
          profile={profile}
          t={t}
          addressError={addressError}
          saveAddress={saveAddress}
        />
      )}

      {editingOrderId && !addressModal && (
        <OrderAddressDialog
          editingOrderId={editingOrderId}
          setEditingOrderId={setEditingOrderId}
          profile={profile}
          changeOrderAddress={changeOrderAddress}
          t={t}
          openAddress={openAddress}
        />
      )}

      {selectedOrder && (
        <OrderDetailDialog
          selectedOrder={selectedOrder}
          setSelectedOrder={setSelectedOrder}
          t={t}
          lang={lang}
          selectedOrderStore={selectedOrderStore}
          selectedOrderAddress={selectedOrderAddress}
          pickupQrError={pickupQrError}
          pickupQrLoading={pickupQrLoading}
          restorePickupQr={restorePickupQr}
          setEditingOrderId={setEditingOrderId}
          catalog={catalog}
        />
      )}

      {success && (
        <OrderSuccessDialog
          success={success}
          setSuccess={setSuccess}
          t={t}
          profile={profile}
          go={go}
        />
      )}
    </div>
  );
}
