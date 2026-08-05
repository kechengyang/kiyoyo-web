"use client";
/* eslint-disable @next/next/no-img-element -- Local prototype assets retain original campaign cropping. */

import { useEffect, useState } from "react";
import { haversineKm, money, stores } from "../data";
import { salePrice, useCatalog } from "../catalog";
import type { Address, AuthProvider, AuthSession, CartItem, Lang, Order, Product, Tab, UserProfile } from "../types";

const copy = {
  en: {
    nav: { home: "Home", shop: "Shop", collection: "Saved", cart: "Cart", account: "Account" },
    location: "Your KIYOYO",
    nearest: "Find nearest",
    heroKicker: "NAIROBI’S HAPPY PLACE",
    heroTitle: "Sip bright.\nLive playful.",
    heroBody: "Fresh drinks, soft soufflés and joyful objects — all in one little red world.",
    orderDrink: "Order a drink",
    shopDrop: "Shop the drop",
    trending: "Trending now",
    seeAll: "See all",
    goods: "Happy things",
    add: "Add",
    customise: "Customise your cup",
    size: "Size",
    sugar: "Sugar",
    ice: "Ice",
    toppings: "Toppings",
    addCart: "Add to cart",
    cancel: "Cancel",
    storeTitle: "Choose a KIYOYO",
    storeSub: "We’ll use this store for drink availability and pickup.",
    useLocation: "Use my location",
    locationDenied: "Location unavailable — choose a store manually.",
    closest: "Closest",
    unverified: "Details to confirm",
    search: "Search drinks & happy things",
    all: "All",
    collectionTitle: "Your happy shelf",
    collectionSub: "Everything you loved, saved in one place.",
    emptySaved: "Nothing saved yet. Tap a heart and make this shelf yours.",
    explore: "Explore the shop",
    cartTitle: "Your cart",
    emptyCart: "Your cart is waiting for something delicious.",
    drinks: "Drinks",
    merch: "Goods",
    subtotal: "Subtotal",
    checkout: "Continue to checkout",
    checkoutTitle: "How should we get it to you?",
    pickup: "Pickup",
    delivery: "Delivery",
    shipping: "Shipping",
    pickupNote: "Pick up drinks at your selected store.",
    deliveryNote: "Demo delivery within Nairobi.",
    mockPay: "Place order · Test payment",
    mockNotice: "No real charge — this is the MVP test payment.",
    success: "Nice! Your order is in.",
    qrHelp: "Show this code at the store for one-time pickup redemption.",
    done: "Back to home",
    member: "KIYOYO MEMBER",
    points: "Points balance",
    coupons: "Coupons",
    rewards: "Rewards",
    history: "History",
    admin: "Open Admin",
    memberHello: "Hey, Nairobi!",
    noOrders: "Your first KIYOYO order will appear here.",
    signIn: "Sign in",
    createAccount: "Create account",
    authTitle: "Welcome to your happy place",
    authSub: "Sign in to save your shelf, earn points and check out faster.",
    email: "Email address",
    password: "Password",
    continueGoogle: "Continue with Google",
    continueFacebook: "Continue with Facebook",
    or: "or continue with email",
    testAuth: "Local MVP demo — social buttons do not contact Google or Facebook yet.",
    profile: "Your profile",
    editProfile: "Edit profile",
    nickname: "Nickname",
    gender: "Gender",
    age: "Age",
    addressBook: "Delivery addresses",
    addAddress: "Add address",
    editAddress: "Edit",
    defaultAddress: "Default",
    signOut: "Sign out",
    completeProfile: "Tell us a little about you",
    save: "Save",
    recipient: "Recipient name",
    phone: "Phone number",
    area: "Area / neighbourhood",
    addressLine: "Building, street and apartment",
    instructions: "Delivery instructions (optional)",
    addressLabel: "Label, e.g. Home",
    makeDefault: "Use as default address",
    chooseAddress: "Choose delivery address",
    changeAddress: "Change address",
    placeOrder: "Place test order",
  },
  zh: {
    nav: { home: "首页", shop: "商城", collection: "收藏", cart: "购物车", account: "我的" },
    location: "当前门店",
    nearest: "查找最近",
    heroKicker: "内罗毕的快乐据点",
    heroTitle: "喝点新鲜。\n玩点有趣。",
    heroBody: "新鲜饮品、松软舒芙蕾与快乐好物，都在这个红色小世界。",
    orderDrink: "马上点饮品",
    shopDrop: "逛新品系列",
    trending: "本周人气",
    seeAll: "查看全部",
    goods: "快乐好物",
    add: "加入",
    customise: "定制你的饮品",
    size: "杯型",
    sugar: "甜度",
    ice: "冰量",
    toppings: "加料",
    addCart: "加入购物车",
    cancel: "取消",
    storeTitle: "选择 KIYOYO 门店",
    storeSub: "饮品库存和自取服务将以此门店为准。",
    useLocation: "使用我的定位",
    locationDenied: "无法取得定位，请手动选择门店。",
    closest: "离你最近",
    unverified: "信息待确认",
    search: "搜索饮品和快乐好物",
    all: "全部",
    collectionTitle: "你的快乐收藏架",
    collectionSub: "喜欢的东西，都放在这里。",
    emptySaved: "还没有收藏。点一下爱心，开始布置你的收藏架吧。",
    explore: "去商城看看",
    cartTitle: "你的购物车",
    emptyCart: "购物车还在等一份好喝或好玩的东西。",
    drinks: "饮品",
    merch: "商品",
    subtotal: "小计",
    checkout: "继续结账",
    checkoutTitle: "你想如何收货？",
    pickup: "到店自取",
    delivery: "外送",
    shipping: "商品配送",
    pickupNote: "前往当前门店自取饮品。",
    deliveryNote: "内罗毕范围演示外送。",
    mockPay: "提交订单 · 测试支付",
    mockNotice: "不会真实扣款，这是 MVP 测试支付。",
    success: "好耶！订单已提交。",
    qrHelp: "到店出示此码，店员扫码后将一次性核销。",
    done: "返回首页",
    member: "KIYOYO 会员",
    points: "积分余额",
    coupons: "优惠券",
    rewards: "奖励",
    history: "历史订单",
    admin: "进入管理后台",
    memberHello: "你好，内罗毕！",
    noOrders: "你的第一笔 KIYOYO 订单会显示在这里。",
    signIn: "登录",
    createAccount: "创建账号",
    authTitle: "欢迎来到你的快乐据点",
    authSub: "登录后可同步收藏、赚取积分并更快结账。",
    email: "邮箱地址",
    password: "密码",
    continueGoogle: "使用 Google 继续",
    continueFacebook: "使用 Facebook 继续",
    or: "或使用邮箱继续",
    testAuth: "本地 MVP 演示——Google 和 Facebook 按钮暂不会连接真实平台。",
    profile: "个人资料",
    editProfile: "编辑资料",
    nickname: "昵称",
    gender: "性别",
    age: "年龄",
    addressBook: "配送地址",
    addAddress: "新增地址",
    editAddress: "编辑",
    defaultAddress: "默认",
    signOut: "退出登录",
    completeProfile: "让我们认识一下你",
    save: "保存",
    recipient: "收件人姓名",
    phone: "电话号码",
    area: "区域 / 社区",
    addressLine: "楼宇、街道和门牌号",
    instructions: "配送说明（选填）",
    addressLabel: "地址标签，例如：家",
    makeDefault: "设为默认地址",
    chooseAddress: "选择配送地址",
    changeAddress: "更改地址",
    placeOrder: "提交测试订单",
  },
};

const emptyProfile: UserProfile = { nickname: "", gender: "", age: "", addresses: [] };
const emptyAddress: Address = { id: "", label: "Home", recipient: "", phone: "", area: "", line1: "", instructions: "", isDefault: false };

function useStoredState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  useEffect(() => {
    // Hydrate browser-only prototype data after the server render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    try { const saved = localStorage.getItem(key); if (saved) setValue(JSON.parse(saved)); } catch { /* local prototype */ }
  }, [key]);
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* local prototype */ } }, [key, value]);
  return [value, setValue] as const;
}

function Logo() {
  return <span className="logo">KIYOYO</span>;
}

function NavIcon({ item }: { item: Tab }) {
  return <span className={`nav-mark nav-${item}`} aria-hidden="true"><i /><em /></span>;
}

function ProductCard({ product, lang, saved, onSave, onOpen, drinkShop = false }: { product: Product; lang: Lang; saved: boolean; onSave: () => void; onOpen: () => void; drinkShop?: boolean }) {
  return (
    <article className={`product-card ${product.kind === "drink" ? "drink-product" : "goods-product"}`}>
      <button className="product-image" onClick={onOpen} aria-label={`Open ${product.name}`}>
        <img src={product.image} alt={lang === "zh" ? product.nameZh : product.name} />
        {(product.discountPercent || 0) > 0 ? <span className="badge sale-badge">−{product.discountPercent}%</span> : product.badge && <span className="badge">{product.badge}</span>}
      </button>
      <div className="product-info">
        <div>
          <span className="eyebrow">{product.category}</span>
          <h3>{lang === "zh" ? product.nameZh : product.name}</h3>
        </div>
        <button className={`heart ${saved ? "saved" : ""}`} onClick={onSave} aria-label="Save product">{saved ? "♥" : "♡"}</button>
      </div>
      <div className="product-bottom"><span className="card-price"><strong>{money(salePrice(product))}</strong>{(product.discountPercent || 0) > 0 && <del>{money(product.price)}</del>}</span><button className={drinkShop ? "customise-card" : "round-add"} onClick={onOpen}>{drinkShop ? (lang === "zh" ? "定制 →" : "Customise →") : "+"}</button></div>
    </article>
  );
}

function SectionHead({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return <div className="section-head"><h2>{title}</h2>{action && <button onClick={onAction}>{action} →</button>}</div>;
}

function PseudoQR({ code }: { code: string }) {
  const bits = Array.from({ length: 121 }, (_, i) => ((code.charCodeAt(i % code.length) * (i + 7) + i * 13) % 7) < 3);
  return <div className="qr" aria-label={`Pickup code ${code}`}>{bits.map((on, i) => <i key={i} className={on ? "on" : ""} />)}</div>;
}

export default function KiyoyoApp() {
  const [lang, setLang] = useStoredState<Lang>("kiyoyo-lang", "en");
  const [catalog] = useCatalog();
  const [tab, setTab] = useState<Tab>("home");
  const [storeId, setStoreId] = useStoredState("kiyoyo-store", "kilimani");
  const [cart, setCart] = useStoredState<CartItem[]>("kiyoyo-cart", []);
  const [saved, setSaved] = useStoredState<string[]>("kiyoyo-saved", ["g1", "d6"]);
  const [orders, setOrders] = useStoredState<Order[]>("kiyoyo-orders", []);
  const [session, setSession] = useStoredState<AuthSession | null>("kiyoyo-session", null);
  const [profile, setProfile] = useStoredState<UserProfile>("kiyoyo-profile", emptyProfile);
  const [modalProduct, setModalProduct] = useState<Product | null>(null);
  const [storeModal, setStoreModal] = useState(false);
  const [checkout, setCheckout] = useState(false);
  const [success, setSuccess] = useState<Order | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState(false);
  const [distances, setDistances] = useState<Record<string, number>>({});
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [shopMode, setShopMode] = useState<"drinks" | "goods">("drinks");
  const [bannerIndex, setBannerIndex] = useState(0);
  const [bannerPaused, setBannerPaused] = useState(false);
  const [custom, setCustom] = useState({ size: "Regular", sugar: "50%", ice: "Less ice", toppings: [] as string[] });
  const [authMode, setAuthMode] = useState<"signin" | "signup" | null>(null);
  const [authForm, setAuthForm] = useState({ email: "", password: "" });
  const [authError, setAuthError] = useState("");
  const [profileModal, setProfileModal] = useState(false);
  const [profileForm, setProfileForm] = useState({ nickname: "", gender: "" as UserProfile["gender"], age: "" });
  const [addressModal, setAddressModal] = useState(false);
  const [addressForm, setAddressForm] = useState<Address>(emptyAddress);
  const [addressError, setAddressError] = useState("");
  const [checkoutChannel, setCheckoutChannel] = useState<Order["channel"] | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [pendingCheckout, setPendingCheckout] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const products = catalog.filter(product => product.active !== false);
  const t = copy[lang];
  const selectedStore = stores.find(s => s.id === storeId) || stores[0];
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    if (bannerPaused) return;
    const timer = window.setInterval(() => setBannerIndex(index => (index + 1) % 3), 6000);
    return () => window.clearInterval(timer);
  }, [bannerPaused]);

  const detailedCart = cart.map(item => ({ ...item, product: catalog.find(p => p.id === item.productId)! })).filter(x => x.product);
  const hasUnavailable = detailedCart.some(item => item.product.active === false);
  const subtotal = detailedCart.filter(item => item.product.active !== false).reduce((sum, item) => sum + salePrice(item.product) * item.quantity + (item.toppings?.length || 0) * 50 * item.quantity, 0);

  const filteredProducts = products.filter(p => {
    const query = search.toLowerCase();
    const matchesText = !query || `${p.name} ${p.nameZh} ${p.category}`.toLowerCase().includes(query);
    const matchesMode = shopMode === "drinks" ? p.kind === "drink" : p.kind === "goods";
    const matchesFilter = ["All", "Drinks", "Goods"].includes(filter) || p.category === filter;
    return matchesText && matchesMode && matchesFilter;
  });

  const openProduct = (product: Product) => {
    setModalProduct(product);
    setCustom({ size: "Regular", sugar: "50%", ice: "Less ice", toppings: [] });
  };

  const addProduct = () => {
    if (!modalProduct) return;
    const options = modalProduct.kind === "drink" ? custom : { size: undefined, sugar: undefined, ice: undefined, toppings: [] };
    const key = `${modalProduct.id}-${Date.now()}`;
    setCart([...cart, { key, productId: modalProduct.id, quantity: 1, ...options }]);
    setModalProduct(null);
  };

  const toggleSave = (id: string) => setSaved(saved.includes(id) ? saved.filter(x => x !== id) : [...saved, id]);
  const updateQty = (key: string, delta: number) => setCart(cart.map(item => item.key === key ? { ...item, quantity: item.quantity + delta } : item).filter(item => item.quantity > 0));

  const openAuth = (mode: "signin" | "signup", afterCheckout = false) => {
    setAuthMode(mode); setAuthError(""); setPendingCheckout(afterCheckout);
  };

  const completeAuth = (provider: AuthProvider) => {
    const email = provider === "password" ? authForm.email.trim().toLowerCase() : `${provider}.demo@kiyoyo.local`;
    if (provider === "password" && (!email.includes("@") || authForm.password.length < 6)) {
      setAuthError(lang === "zh" ? "请输入有效邮箱，密码至少 6 位。" : "Enter a valid email and a password of at least 6 characters."); return;
    }
    const nextSession = { id: `demo-${provider}-${email}`, email, provider } as AuthSession;
    setSession(nextSession); setAuthMode(null); setAuthForm({ email: "", password: "" });
    if (!profile.nickname) {
      const suggested = email.split("@")[0].replace(/[._-]/g, " ");
      setProfileForm({ nickname: suggested.charAt(0).toUpperCase() + suggested.slice(1), gender: "", age: "" });
      setProfileModal(true);
    } else if (pendingCheckout) {
      setCheckout(true); setCheckoutChannel(null);
      setPendingCheckout(false);
    } else {
      setPendingCheckout(false);
    }
  };

  const openProfile = () => {
    setProfileForm({ nickname: profile.nickname, gender: profile.gender, age: profile.age }); setProfileModal(true);
  };

  const saveProfile = () => {
    if (!profileForm.nickname.trim() || !profileForm.age || Number(profileForm.age) < 13 || Number(profileForm.age) > 120) return;
    setProfile({ ...profile, ...profileForm, nickname: profileForm.nickname.trim() }); setProfileModal(false);
    if (pendingCheckout) { setCheckout(true); setCheckoutChannel(null); setPendingCheckout(false); }
  };

  const openAddress = (address?: Address) => {
    setAddressForm(address ? { ...address } : { ...emptyAddress, id: `addr-${Date.now()}`, isDefault: profile.addresses.length === 0 });
    setAddressError(""); setAddressModal(true);
  };

  const saveAddress = () => {
    if (!addressForm.label.trim() || !addressForm.recipient.trim() || !addressForm.phone.trim() || !addressForm.area.trim() || !addressForm.line1.trim()) {
      setAddressError(lang === "zh" ? "请填写所有必填地址信息。" : "Complete all required address fields."); return;
    }
    const normalized = profile.addresses.map(a => addressForm.isDefault ? { ...a, isDefault: false } : a);
    const exists = normalized.some(a => a.id === addressForm.id);
    const addresses = exists ? normalized.map(a => a.id === addressForm.id ? addressForm : a) : [...normalized, addressForm];
    setProfile({ ...profile, addresses }); setSelectedAddressId(addressForm.id); setAddressModal(false);
    if (editingOrderId) {
      setOrders(orders.map(order => order.id === editingOrderId ? { ...order, addressId: addressForm.id } : order));
      setEditingOrderId(null);
    }
  };

  const setDefaultAddress = (id: string) => setProfile({ ...profile, addresses: profile.addresses.map(a => ({ ...a, isDefault: a.id === id })) });

  const beginCheckout = () => {
    if (hasUnavailable) return;
    if (!session) { openAuth("signin", true); return; }
    setSelectedAddressId(profile.addresses.find(a => a.isDefault)?.id || profile.addresses[0]?.id || "");
    setCheckoutChannel(null); setCheckout(true);
  };

  const changeOrderAddress = (addressId: string) => {
    if (!editingOrderId) return;
    setOrders(orders.map(order => order.id === editingOrderId ? { ...order, addressId } : order));
    setEditingOrderId(null);
  };

  const locate = () => {
    setLocating(true); setLocationError(false);
    if (!navigator.geolocation) { setLocationError(true); setLocating(false); return; }
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      const found = stores.filter(s => s.lat && s.lng).map(s => ({ id: s.id, km: haversineKm(coords.latitude, coords.longitude, s.lat!, s.lng!) })).sort((a, b) => a.km - b.km);
      setDistances(Object.fromEntries(found.map(x => [x.id, x.km])));
      if (found[0]) setStoreId(found[0].id);
      setLocating(false);
    }, () => { setLocationError(true); setLocating(false); }, { enableHighAccuracy: false, timeout: 8000 });
  };

  const placeOrder = (channel: Order["channel"]) => {
    if (channel !== "Pickup" && !selectedAddressId) return;
    const now = new Date();
    const timeToken = now.getTime().toString(36).toUpperCase();
    const order: Order = {
      id: `KYO-${now.getFullYear().toString().slice(-2)}${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getTime()).slice(-4)}`,
      createdAt: now.toISOString(), status: "Placed", channel, storeId, total: subtotal, items: cart,
      pickupCode: timeToken.slice(-8).padStart(8, "K"),
      addressId: channel === "Pickup" ? undefined : selectedAddressId,
    };
    setOrders([order, ...orders]); setCart([]); setCheckout(false); setCheckoutChannel(null); setSuccess(order);
  };

  const go = (next: Tab) => { setTab(next); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const openShop = (mode: "drinks" | "goods", nextFilter?: string) => {
    setShopMode(mode);
    setFilter(nextFilter || (mode === "drinks" ? "Drinks" : "Goods"));
    setSearch("");
    go("shop");
  };
  const campaigns = [
    { image: "/images/events/fruit-tea-campaign-v2.jpg", alt: "KIYOYO Fruit Ice Joy campaign", tag: lang === "zh" ? "01 / 果茶新作" : "01 / FRUIT DROP", title: lang === "zh" ? "热带果茶季" : "Fruit Rush", body: lang === "zh" ? "真实鲜果、冰爽茶底，装进内罗毕的阳光。" : "Real fruit, bright tea and a little Nairobi sun.", cta: lang === "zh" ? "选一杯果茶" : "Shop fruit teas", mode: "drinks" as const, filter: "Fruit Tea" },
    { image: "/images/events/event-3.jpg", alt: "KIYOYO sundae club campaign", tag: lang === "zh" ? "02 / 下午四点后" : "02 / AFTER FOUR", title: lang === "zh" ? "圣代俱乐部" : "Sundae Club", body: lang === "zh" ? "甜一点，今天就会更快乐一点。" : "A softer, sweeter finish to the day.", cta: lang === "zh" ? "挑选甜品" : "Pick a treat", mode: "drinks" as const, filter: "Dessert" },
    { image: "/images/goods/streetwear.png", alt: "KIYOYO streetwear campaign", tag: lang === "zh" ? "03 / 新品系列" : "03 / NEW DROP", title: lang === "zh" ? "穿上好心情" : "Wear the mood", body: lang === "zh" ? "把 KIYOYO 的红色能量带出门。" : "Take KIYOYO's red energy beyond the cup.", cta: lang === "zh" ? "逛潮流商品" : "Shop the drop", mode: "goods" as const, filter: "Fashion" },
  ];
  const activeCampaign = campaigns[bannerIndex];
  const runCampaign = () => openShop(activeCampaign.mode, activeCampaign.filter);

  return (
    <div className="app-shell">
      <div className="top-strip"><span>NAIROBI, KENYA</span><span>FRESHLY MADE · PLAYFULLY SERVED</span><span>EST. WITH JOY</span></div>
      <header className="site-header">
        <button className="store-button" onClick={() => setStoreModal(true)}><span>⌖</span><span><small>{t.location}</small><strong>{selectedStore.area}⌄</strong></span></button>
        <button className="brand-button" onClick={() => go("home")}><Logo /></button>
        <div className="header-actions"><button className="lang" onClick={() => setLang(lang === "en" ? "zh" : "en")}>{lang === "en" ? "中文" : "EN"}</button><button className="desktop-cart" onClick={() => go("cart")}>BAG <b>{cartCount}</b></button></div>
      </header>
      <nav className="desktop-nav">
        {(Object.keys(t.nav) as Tab[]).map(item => <button key={item} className={tab === item ? "active" : ""} onClick={() => item === "shop" ? openShop("drinks") : go(item)}>{t.nav[item]}{item === "cart" && cartCount > 0 && <sup>{cartCount}</sup>}</button>)}
      </nav>

      <main>
        {tab === "home" && <>
          <section className="campaign-carousel" aria-roledescription="carousel" aria-label="KIYOYO campaigns" onMouseEnter={() => setBannerPaused(true)} onMouseLeave={() => setBannerPaused(false)}>
            <div className="campaign-stage" key={bannerIndex}><img src={activeCampaign.image} alt={activeCampaign.alt} /></div>
            <button className="campaign-arrow previous" aria-label="Previous campaign" onClick={() => setBannerIndex(index => (index + campaigns.length - 1) % campaigns.length)}>←</button>
            <button className="campaign-arrow next" aria-label="Next campaign" onClick={() => setBannerIndex(index => (index + 1) % campaigns.length)}>→</button>
            <div className="campaign-info"><span>{activeCampaign.tag}</span><div><strong>{activeCampaign.title}</strong><small>{activeCampaign.body}</small></div><button onClick={runCampaign}>{activeCampaign.cta} ↗</button></div>
            <div className="campaign-dots">{campaigns.map((campaign, index) => <button key={campaign.tag} className={bannerIndex === index ? "active" : ""} aria-label={`Show campaign ${index + 1}`} onClick={() => setBannerIndex(index)}><i /></button>)}</div>
          </section>
          <div className="marquee"><div>BOBA · SOUFFLÉ · HAPPY THINGS · NAIROBI · BOBA · SOUFFLÉ · HAPPY THINGS · NAIROBI ·</div></div>
          <section className="content-section"><SectionHead title={t.trending} action={t.seeAll} onAction={() => openShop("drinks")} /><div className="product-grid featured">{products.filter(p => p.kind === "drink").slice(0, 4).map(p => <ProductCard key={p.id} product={p} lang={lang} saved={saved.includes(p.id)} onSave={() => toggleSave(p.id)} onOpen={() => openProduct(p)} />)}</div></section>
          <section className="story-band"><div className="story-photo"><img src="/images/goods/streetwear.png" alt="KIYOYO streetwear" /></div><div className="story-copy"><span className="eyebrow">KIYOYO WORLD / 001</span><h2>{lang === "zh" ? "不只是一杯奶茶。" : "More than a cup."}</h2><p>{lang === "zh" ? "我们把内罗毕的能量装进饮品、衣服、家居和每一个小小收藏。" : "We bottle Nairobi energy into drinks, clothes, spaces and tiny objects worth keeping."}</p><button className="primary invert" onClick={() => openShop("goods")}>{t.shopDrop} →</button></div></section>
          <section className="content-section"><SectionHead title={t.goods} action={t.seeAll} onAction={() => openShop("goods")} /><div className="editorial-grid">{products.filter(p => p.kind === "goods").slice(0, 5).map((p, i) => <div className={`editorial-card e${i}`} key={p.id}><ProductCard product={p} lang={lang} saved={saved.includes(p.id)} onSave={() => toggleSave(p.id)} onOpen={() => openProduct(p)} /></div>)}</div></section>
        </>}

        {tab === "shop" && <section className="shop-page content-section">
          <div className="shop-mode-switch"><button className={shopMode === "drinks" ? "active" : ""} onClick={() => openShop("drinks")}><NavIcon item="shop" /><span><strong>{lang === "zh" ? "饮品点单" : "Drink studio"}</strong><small>{lang === "zh" ? "现点现做 · 可定制" : "Made fresh · Your way"}</small></span></button><button className={shopMode === "goods" ? "active" : ""} onClick={() => openShop("goods")}><span className="goods-mode-icon">◇</span><span><strong>{lang === "zh" ? "IP 商品" : "KIYOYO goods"}</strong><small>{lang === "zh" ? "穿搭 · 家居 · 收藏" : "Wear · Live · Collect"}</small></span></button></div>
          {shopMode === "drinks" ? <>
            <div className="drink-studio-hero"><div><span className="drink-kicker">KIYOYO DRINK STUDIO / {selectedStore.area}</span><h1>{lang === "zh" ? "先选心情，\n再定制一杯。" : "Pick a mood.\nMake it yours."}</h1><p>{lang === "zh" ? "从茶底到甜度、冰量和加料，每一杯都按你的方式现做。" : "Choose a flavour, then tune the size, sweetness, ice and toppings to you."}</p><button className="store-status" onClick={() => setStoreModal(true)}><i />{selectedStore.area} · {lang === "zh" ? "预计 15–20 分钟" : "Ready in 15–20 min"}<b>Change →</b></button></div><div className="drink-flow"><span><b>01</b>{lang === "zh" ? "选口味" : "Pick"}</span><span><b>02</b>{lang === "zh" ? "做定制" : "Tune"}</span><span><b>03</b>{lang === "zh" ? "自取或外送" : "Get it"}</span></div></div>
            <div className="mood-picker"><button onClick={() => setFilter("Milk Tea")} className={filter === "Milk Tea" ? "active creamy" : "creamy"}><i>●</i><strong>{lang === "zh" ? "浓郁奶香" : "Creamy"}</strong><small>Milk Tea</small></button><button onClick={() => setFilter("Fruit Tea")} className={filter === "Fruit Tea" ? "active bright" : "bright"}><i>✦</i><strong>{lang === "zh" ? "清爽果香" : "Bright & fresh"}</strong><small>Fruit Tea</small></button><button onClick={() => setFilter("Coffee")} className={filter === "Coffee" ? "active energy" : "energy"}><i>↯</i><strong>{lang === "zh" ? "能量加满" : "Energy"}</strong><small>Coffee</small></button><button onClick={() => setFilter("Dessert")} className={filter === "Dessert" ? "active treat" : "treat"}><i>♡</i><strong>{lang === "zh" ? "奖励一下" : "Treat mode"}</strong><small>Dessert</small></button></div>
            <div className="shop-tools drink-tools"><label className="search-box"><span>⌕</span><input value={search} onChange={e => setSearch(e.target.value)} placeholder={lang === "zh" ? "搜索饮品" : "Search the drink menu"} /></label><div className="filters">{["Drinks", "Milk Tea", "Fruit Tea", "Coffee", "Jelly Tea", "Dessert"].map(f => <button key={f} className={filter === f ? "active" : ""} onClick={() => setFilter(f)}>{f === "Drinks" ? (lang === "zh" ? "全部饮品" : "All drinks") : f}</button>)}</div></div>
            <div className="drink-catalog-head"><div><span>{lang === "zh" ? "本店菜单" : "YOUR STORE MENU"}</span><h2>{filter === "Drinks" || filter === "All" ? (lang === "zh" ? "全部饮品" : "All drinks") : filter}</h2></div><strong>{filteredProducts.length} {lang === "zh" ? "款可选" : "choices"}</strong></div>
            <div className="product-grid drink-grid">{filteredProducts.map(p => <ProductCard key={p.id} product={p} lang={lang} saved={saved.includes(p.id)} onSave={() => toggleSave(p.id)} onOpen={() => openProduct(p)} drinkShop />)}</div>
          </> : <>
            <div className="goods-shop-heading"><span className="sticker">KIYOYO MARKET</span><h1>{lang === "zh" ? "把快乐带回家。" : "Keep the good mood."}</h1><p>{lang === "zh" ? "服饰、家居与可以收藏的小东西。" : "Wear it, live with it, collect it."}</p></div>
            <div className="shop-tools"><label className="search-box"><span>⌕</span><input value={search} onChange={e => setSearch(e.target.value)} placeholder={lang === "zh" ? "搜索 KIYOYO 商品" : "Search KIYOYO goods"} /></label><div className="filters">{["Goods", "Fashion", "Home", "Outdoor", "Pets", "Accessories", "Collectibles"].map(f => <button key={f} className={filter === f ? "active" : ""} onClick={() => setFilter(f)}>{f === "Goods" ? (lang === "zh" ? "全部商品" : "All goods") : f}</button>)}</div></div>
            <div className="product-grid">{filteredProducts.map(p => <ProductCard key={p.id} product={p} lang={lang} saved={saved.includes(p.id)} onSave={() => toggleSave(p.id)} onOpen={() => openProduct(p)} />)}</div>
          </>}
        </section>}

        {tab === "collection" && <section className="content-section collection-page"><div className="page-heading"><span className="sticker">♡ YOURS</span><h1>{t.collectionTitle}</h1><p>{t.collectionSub}</p></div>{saved.length ? <div className="product-grid">{products.filter(p => saved.includes(p.id)).map(p => <ProductCard key={p.id} product={p} lang={lang} saved onSave={() => toggleSave(p.id)} onOpen={() => openProduct(p)} />)}</div> : <div className="empty-state"><span>♡</span><p>{t.emptySaved}</p><button className="primary" onClick={() => go("shop")}>{t.explore}</button></div>}</section>}

        {tab === "cart" && <section className="content-section cart-page"><div className="page-heading"><span className="sticker">{cartCount} ITEMS</span><h1>{t.cartTitle}</h1></div>{!cart.length ? <div className="empty-state"><span>▱</span><p>{t.emptyCart}</p><button className="primary" onClick={() => go("shop")}>{t.explore}</button></div> : <div className="cart-layout"><div className="cart-list">{detailedCart.map(item => <article className={`cart-row ${item.product.active === false ? "unavailable" : ""}`} key={item.key}><img src={item.product.image} alt={item.product.name} /><div className="cart-name"><span className="eyebrow">{item.product.active === false ? (lang === "zh" ? "已下架" : "Unavailable") : item.product.kind === "drink" ? t.drinks : t.merch}</span><h3>{lang === "zh" ? item.product.nameZh : item.product.name}</h3>{item.product.kind === "drink" && <small>{item.size} · {item.sugar} · {item.ice}{item.toppings?.length ? ` · ${item.toppings.join(", ")}` : ""}</small>}<strong>{money(salePrice(item.product) + (item.toppings?.length || 0) * 50)}</strong></div><div className="qty"><button onClick={() => updateQty(item.key, -1)}>−</button><span>{item.quantity}</span><button onClick={() => updateQty(item.key, 1)} disabled={item.product.active === false}>+</button></div></article>)}</div><aside className="cart-summary"><h2>{lang === "zh" ? "订单概要" : "Order summary"}</h2><div><span>{t.subtotal}</span><strong>{money(subtotal)}</strong></div><div><span>{lang === "zh" ? "配送费" : "Delivery"}</span><span>{lang === "zh" ? "结账时计算" : "Calculated next"}</span></div><button className="primary full" disabled={hasUnavailable} onClick={beginCheckout}>{t.checkout} →</button><small>{hasUnavailable ? (lang === "zh" ? "请移除已下架商品后结账。" : "Remove unavailable items before checkout.") : session ? t.mockNotice : (lang === "zh" ? "结账前需要登录。" : "Sign in is required at checkout.")}</small></aside></div>}</section>}

        {tab === "account" && <section className="account-page content-section">{!session ? <div className="account-auth"><div><span className="sticker">KIYOYO MEMBERS</span><h1>{t.authTitle}</h1><p>{t.authSub}</p><div><button className="primary" onClick={() => openAuth("signup")}>{t.createAccount} →</button><button className="text-button" onClick={() => openAuth("signin")}>{t.signIn}</button></div></div><aside><b>♡</b><strong>{lang === "zh" ? "同步收藏" : "Save your favourites"}</strong><span>{lang === "zh" ? "换设备也不会丢失" : "Keep them across devices"}</span><b>✦</b><strong>{lang === "zh" ? "积分与奖励" : "Points & rewards"}</strong><span>{lang === "zh" ? "每次快乐都有回报" : "Get more from every order"}</span><b>▤</b><strong>{lang === "zh" ? "订单与地址" : "Orders & addresses"}</strong><span>{lang === "zh" ? "快速结账、随时修改" : "Check out and update faster"}</span></aside></div> : <><div className="member-card"><div><span>{t.member}</span><h1>{profile.nickname || t.memberHello}</h1><small>{t.points}</small><strong>2,480</strong></div><Logo /><i>VIP</i></div><section className="profile-panel"><div className="profile-head"><div><span className="eyebrow">{t.profile}</span><h2>{profile.nickname}</h2><p>{session.email} · {session.provider}</p></div><button onClick={openProfile}>{t.editProfile} →</button></div><div className="profile-facts"><div><span>{t.gender}</span><strong>{profile.gender || "—"}</strong></div><div><span>{t.age}</span><strong>{profile.age || "—"}</strong></div><div><span>{lang === "zh" ? "登录方式" : "Sign-in method"}</span><strong>{session.provider}</strong></div></div><div className="address-head"><h3>{t.addressBook}</h3><button onClick={() => openAddress()}>+ {t.addAddress}</button></div>{profile.addresses.length ? <div className="address-grid">{profile.addresses.map(address => <article key={address.id} className={address.isDefault ? "default" : ""}><div><strong>{address.label}</strong>{address.isDefault && <em>{t.defaultAddress}</em>}</div><p>{address.recipient} · {address.phone}</p><span>{address.line1}, {address.area}</span><div><button onClick={() => openAddress(address)}>{t.editAddress}</button>{!address.isDefault && <button onClick={() => setDefaultAddress(address.id)}>{lang === "zh" ? "设为默认" : "Make default"}</button>}</div></article>)}</div> : <button className="empty-address" onClick={() => openAddress()}>⌖ <span>{lang === "zh" ? "添加默认配送地址，让下次结账更快。" : "Add a default delivery address for faster checkout."}</span></button>}</section><div className="account-tabs"><button className="active">{t.coupons}</button><button>{t.rewards}</button><button>{t.history}</button></div><div className="coupon-grid"><article><b>20%</b><div><strong>ALL DRINKS</strong><span>MIN. SPEND KSh 800</span></div><button>USE</button></article><article className="gold"><b>2×</b><div><strong>DOUBLE POINTS</strong><span>FRIDAY AFTER 4PM</span></div><button>USE</button></article><article className="dark"><b>FREE</b><div><strong>SIZE UPGRADE</strong><span>MEMBER TREAT</span></div><button>USE</button></article></div><SectionHead title={t.history} />{orders.length ? <div className="order-history">{orders.map(o => { const orderAddress = profile.addresses.find(a => a.id === o.addressId); return <article key={o.id}><div><strong>{o.id}</strong><span>{new Date(o.createdAt).toLocaleString(lang === "zh" ? "zh-CN" : "en-KE", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Nairobi" })}</span>{o.channel !== "Pickup" && <small>{orderAddress ? `${orderAddress.label} · ${orderAddress.line1}` : (lang === "zh" ? "未设置配送地址" : "No delivery address")}</small>}</div><div><span className="status">{o.status}</span><strong>{money(o.total)}</strong>{o.channel !== "Pickup" && o.status === "Placed" && <button className="order-address-edit" onClick={() => setEditingOrderId(o.id)}>{t.changeAddress}</button>}</div></article>})}</div> : <div className="order-empty">{t.noOrders}</div>}<div className="account-links"><a className="admin-link" href="/admin">⚙ {t.admin} →</a><button onClick={() => { setSession(null); go("home"); }}>{t.signOut}</button></div></>}</section>}
      </main>

      <nav className="mobile-nav">{(Object.keys(t.nav) as Tab[]).map(item => <button key={item} className={`${tab === item ? "active" : ""} ${item === "shop" ? "drink-entry" : ""}`} onClick={() => item === "shop" ? openShop("drinks") : go(item)}><NavIcon item={item} /><span>{item === "shop" ? (lang === "zh" ? "点饮品" : "DRINK") : t.nav[item]}</span>{item === "cart" && cartCount > 0 && <b>{cartCount}</b>}</button>)}</nav>

      {modalProduct && <div className="modal-backdrop" onMouseDown={e => e.currentTarget === e.target && setModalProduct(null)}><div className="product-modal"><button className="modal-close" onClick={() => setModalProduct(null)}>×</button><div className="modal-image"><img src={modalProduct.image} alt={modalProduct.name} />{(modalProduct.discountPercent || 0) > 0 ? <span className="badge sale-badge">−{modalProduct.discountPercent}%</span> : modalProduct.badge && <span className="badge">{modalProduct.badge}</span>}</div><div className="modal-copy"><span className="eyebrow">{modalProduct.category}</span><h2>{lang === "zh" ? modalProduct.nameZh : modalProduct.name}</h2><p>{lang === "zh" ? modalProduct.descriptionZh : modalProduct.description}</p><div className="modal-sale-price"><strong className="modal-price">{money(salePrice(modalProduct))}</strong>{(modalProduct.discountPercent || 0) > 0 && <del>{money(modalProduct.price)}</del>}</div>{modalProduct.kind === "drink" && <div className="custom-options"><Option title={t.size} options={["Regular", "Large +80"]} value={custom.size} onChange={size => setCustom({ ...custom, size })} /><Option title={t.sugar} options={["0%", "30%", "50%", "100%"]} value={custom.sugar} onChange={sugar => setCustom({ ...custom, sugar })} /><Option title={t.ice} options={["No ice", "Less ice", "Regular"]} value={custom.ice} onChange={ice => setCustom({ ...custom, ice })} /><div className="option-group"><b>{t.toppings} <small>+ KSh 50</small></b><div>{["Boba", "Coconut jelly", "Milk cap"].map(top => <button key={top} className={custom.toppings.includes(top) ? "active" : ""} onClick={() => setCustom({ ...custom, toppings: custom.toppings.includes(top) ? custom.toppings.filter(x => x !== top) : [...custom.toppings, top] })}>{top}</button>)}</div></div></div>}<button className="primary full" onClick={addProduct}>{t.addCart} · {money(salePrice(modalProduct) + custom.toppings.length * 50)}</button></div></div></div>}

      {storeModal && <div className="modal-backdrop" onMouseDown={e => e.currentTarget === e.target && setStoreModal(false)}><div className="store-modal"><button className="modal-close" onClick={() => setStoreModal(false)}>×</button><span className="sticker">6 NAIROBI STORES</span><h2>{t.storeTitle}</h2><p>{t.storeSub}</p><button className="locate-button" onClick={locate} disabled={locating}>⌖ {locating ? "Locating…" : t.useLocation}</button>{locationError && <small className="error">{t.locationDenied}</small>}<div className="store-list">{stores.map((store, index) => <button key={store.id} disabled={!store.lat} className={store.id === storeId ? "selected" : ""} onClick={() => { setStoreId(store.id); setStoreModal(false); }}><span className="store-index">0{index + 1}</span><span><strong>{store.name}</strong><small>{store.address}</small><em>{store.verified ? store.phone : t.unverified}</em></span>{distances[store.id] !== undefined && <b>{distances[store.id].toFixed(1)} km{Object.values(distances).sort((a, b) => a - b)[0] === distances[store.id] ? ` · ${t.closest}` : ""}</b>}</button>)}</div></div></div>}

      {checkout && <div className="modal-backdrop"><div className="checkout-modal"><button className="modal-close" onClick={() => { setCheckout(false); setCheckoutChannel(null); }}>×</button><span className="sticker">TEST CHECKOUT</span><h2>{t.checkoutTitle}</h2><p>{selectedStore.name} · {money(subtotal)}</p><div className="fulfilment-cards"><button className={checkoutChannel === "Pickup" ? "selected" : ""} onClick={() => setCheckoutChannel("Pickup")}><i>⌂</i><strong>{t.pickup}</strong><span>{t.pickupNote}</span></button><button className={checkoutChannel === "Delivery" ? "selected" : ""} onClick={() => setCheckoutChannel("Delivery")}><i>⌁</i><strong>{t.delivery}</strong><span>{t.deliveryNote}</span></button>{detailedCart.some(x => x.product.kind === "goods") && <button className={checkoutChannel === "Shipping" ? "selected" : ""} onClick={() => setCheckoutChannel("Shipping")}><i>▧</i><strong>{t.shipping}</strong><span>Nairobi shipping demo</span></button>}</div>{checkoutChannel && checkoutChannel !== "Pickup" && <section className="checkout-address"><div><h3>{t.chooseAddress}</h3><button onClick={() => openAddress()}>+ {t.addAddress}</button></div>{profile.addresses.length ? profile.addresses.map(address => <label key={address.id} className={selectedAddressId === address.id ? "selected" : ""}><input type="radio" name="checkout-address" checked={selectedAddressId === address.id} onChange={() => setSelectedAddressId(address.id)} /><span><strong>{address.label}{address.isDefault ? ` · ${t.defaultAddress}` : ""}</strong><small>{address.recipient} · {address.phone}<br />{address.line1}, {address.area}</small></span><button type="button" onClick={() => openAddress(address)}>{t.editAddress}</button></label>) : <button className="empty-address compact" onClick={() => openAddress()}>+ {t.addAddress}</button>}</section>}{checkoutChannel && <button className="primary full checkout-submit" disabled={checkoutChannel !== "Pickup" && !selectedAddressId} onClick={() => placeOrder(checkoutChannel)}>{t.placeOrder} · {money(subtotal)}</button>}<small className="mock-note">ⓘ {t.mockNotice}</small></div></div>}

      {authMode && <div className="modal-backdrop"><div className="auth-modal"><button className="modal-close" onClick={() => { setAuthMode(null); setPendingCheckout(false); }}>×</button><Logo /><span className="auth-kicker">{authMode === "signup" ? t.createAccount : t.signIn}</span><h2>{t.authTitle}</h2><p>{t.authSub}</p><button className="social google" onClick={() => completeAuth("google")}><b>G</b>{t.continueGoogle}</button><button className="social facebook" onClick={() => completeAuth("facebook")}><b>f</b>{t.continueFacebook}</button><div className="auth-divider"><span>{t.or}</span></div><label className="form-field"><span>{t.email}</span><input type="email" value={authForm.email} onChange={e => setAuthForm({ ...authForm, email: e.target.value })} placeholder="you@example.com" autoComplete="email" /></label><label className="form-field"><span>{t.password}</span><input type="password" value={authForm.password} onChange={e => setAuthForm({ ...authForm, password: e.target.value })} placeholder="6+ characters" autoComplete={authMode === "signup" ? "new-password" : "current-password"} /></label>{authError && <div className="form-error">{authError}</div>}<button className="primary full" onClick={() => completeAuth("password")}>{authMode === "signup" ? t.createAccount : t.signIn} →</button><button className="auth-switch" onClick={() => { setAuthMode(authMode === "signup" ? "signin" : "signup"); setAuthError(""); }}>{authMode === "signup" ? (lang === "zh" ? "已有账号？登录" : "Already a member? Sign in") : (lang === "zh" ? "还没有账号？注册" : "New here? Create account")}</button><small className="auth-test">ⓘ {t.testAuth}</small></div></div>}

      {profileModal && <div className="modal-backdrop"><div className="profile-modal"><button className="modal-close" onClick={() => { setProfileModal(false); setPendingCheckout(false); }}>×</button><span className="sticker">MEMBER PROFILE</span><h2>{profile.nickname ? t.editProfile : t.completeProfile}</h2><p>{session?.email}</p><label className="form-field"><span>{t.nickname}</span><input value={profileForm.nickname} onChange={e => setProfileForm({ ...profileForm, nickname: e.target.value })} placeholder={lang === "zh" ? "大家怎么称呼你？" : "What should we call you?"} /></label><div className="form-split"><label className="form-field"><span>{t.gender}</span><select value={profileForm.gender} onChange={e => setProfileForm({ ...profileForm, gender: e.target.value as UserProfile["gender"] })}><option value="">—</option><option>Female</option><option>Male</option><option>Non-binary</option><option>Prefer not to say</option></select></label><label className="form-field"><span>{t.age}</span><input type="number" min="13" max="120" value={profileForm.age} onChange={e => setProfileForm({ ...profileForm, age: e.target.value })} placeholder="18+" /></label></div><small className="profile-privacy">{lang === "zh" ? "年龄与性别用于会员分析和更合适的推荐，不会公开展示。" : "Age and gender help with member insights and recommendations. They are never shown publicly."}</small><button className="primary full" disabled={!profileForm.nickname.trim() || Number(profileForm.age) < 13} onClick={saveProfile}>{t.save} →</button></div></div>}

      {addressModal && <div className="modal-backdrop"><div className="address-modal"><button className="modal-close" onClick={() => setAddressModal(false)}>×</button><span className="sticker">NAIROBI DELIVERY</span><h2>{addressForm.id && profile.addresses.some(a => a.id === addressForm.id) ? t.editAddress : t.addAddress}</h2><div className="form-split"><label className="form-field"><span>{t.addressLabel}</span><input value={addressForm.label} onChange={e => setAddressForm({ ...addressForm, label: e.target.value })} /></label><label className="form-field"><span>{t.recipient}</span><input value={addressForm.recipient} onChange={e => setAddressForm({ ...addressForm, recipient: e.target.value })} /></label></div><label className="form-field"><span>{t.phone}</span><input type="tel" value={addressForm.phone} onChange={e => setAddressForm({ ...addressForm, phone: e.target.value })} placeholder="+254 7•• ••• •••" /></label><label className="form-field"><span>{t.area}</span><input value={addressForm.area} onChange={e => setAddressForm({ ...addressForm, area: e.target.value })} placeholder="Kilimani, Westlands, CBD…" /></label><label className="form-field"><span>{t.addressLine}</span><input value={addressForm.line1} onChange={e => setAddressForm({ ...addressForm, line1: e.target.value })} /></label><label className="form-field"><span>{t.instructions}</span><textarea value={addressForm.instructions} onChange={e => setAddressForm({ ...addressForm, instructions: e.target.value })} /></label><label className="default-check"><input type="checkbox" checked={addressForm.isDefault} onChange={e => setAddressForm({ ...addressForm, isDefault: e.target.checked })} /><span>{t.makeDefault}</span></label>{addressError && <div className="form-error">{addressError}</div>}<button className="primary full" onClick={saveAddress}>{t.save} →</button></div></div>}

      {editingOrderId && !addressModal && <div className="modal-backdrop"><div className="order-address-modal"><button className="modal-close" onClick={() => setEditingOrderId(null)}>×</button><span className="sticker">ACTIVE ORDER</span><h2>{t.changeAddress}</h2><p>{editingOrderId}</p>{profile.addresses.map(address => <button key={address.id} onClick={() => changeOrderAddress(address.id)}><strong>{address.label}{address.isDefault ? ` · ${t.defaultAddress}` : ""}</strong><span>{address.recipient} · {address.line1}, {address.area}</span></button>)}<button className="add-order-address" onClick={() => openAddress()}>+ {t.addAddress}</button></div></div>}

      {success && <div className="modal-backdrop"><div className="success-modal"><span className="success-pop">✓</span><h2>{t.success}</h2><strong className="order-number">{success.id}</strong>{success.channel === "Pickup" ? <><PseudoQR code={success.pickupCode} /><code>{success.pickupCode}</code><p>{t.qrHelp}</p></> : <><div className="delivery-success">⌁</div><p>{success.channel} · {profile.addresses.find(a => a.id === success.addressId)?.line1}</p></>}<button className="primary full" onClick={() => { setSuccess(null); go("home"); }}>{t.done}</button></div></div>}
    </div>
  );
}

function Option({ title, options, value, onChange }: { title: string; options: string[]; value: string; onChange: (value: string) => void }) {
  return <div className="option-group"><b>{title}</b><div>{options.map(option => <button key={option} className={value === option ? "active" : ""} onClick={() => onChange(option)}>{option}</button>)}</div></div>;
}
