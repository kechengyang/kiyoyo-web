"use client";
/* eslint-disable @next/next/no-img-element -- Local prototype assets retain original campaign cropping. */

import { useEffect, useMemo, useState } from "react";
import { haversineKm, money, products, stores } from "../data";
import type { CartItem, Lang, Order, Product, Tab } from "../types";

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
  },
};

const navIcons: Record<Tab, string> = { home: "⌂", shop: "◉", collection: "♡", cart: "▱", account: "☺" };

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

function ProductCard({ product, lang, saved, onSave, onOpen }: { product: Product; lang: Lang; saved: boolean; onSave: () => void; onOpen: () => void }) {
  return (
    <article className="product-card">
      <button className="product-image" onClick={onOpen} aria-label={`Open ${product.name}`}>
        <img src={product.image} alt={lang === "zh" ? product.nameZh : product.name} />
        {product.badge && <span className="badge">{product.badge}</span>}
      </button>
      <div className="product-info">
        <div>
          <span className="eyebrow">{product.category}</span>
          <h3>{lang === "zh" ? product.nameZh : product.name}</h3>
        </div>
        <button className={`heart ${saved ? "saved" : ""}`} onClick={onSave} aria-label="Save product">{saved ? "♥" : "♡"}</button>
      </div>
      <div className="product-bottom"><strong>{money(product.price)}</strong><button className="round-add" onClick={onOpen}>+</button></div>
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
  const [tab, setTab] = useState<Tab>("home");
  const [storeId, setStoreId] = useStoredState("kiyoyo-store", "kilimani");
  const [cart, setCart] = useStoredState<CartItem[]>("kiyoyo-cart", []);
  const [saved, setSaved] = useStoredState<string[]>("kiyoyo-saved", ["g1", "d6"]);
  const [orders, setOrders] = useStoredState<Order[]>("kiyoyo-orders", []);
  const [modalProduct, setModalProduct] = useState<Product | null>(null);
  const [storeModal, setStoreModal] = useState(false);
  const [checkout, setCheckout] = useState(false);
  const [success, setSuccess] = useState<Order | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState(false);
  const [distances, setDistances] = useState<Record<string, number>>({});
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [custom, setCustom] = useState({ size: "Regular", sugar: "50%", ice: "Less ice", toppings: [] as string[] });
  const t = copy[lang];
  const selectedStore = stores.find(s => s.id === storeId) || stores[0];
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const detailedCart = cart.map(item => ({ ...item, product: products.find(p => p.id === item.productId)! })).filter(x => x.product);
  const subtotal = detailedCart.reduce((sum, item) => sum + item.product.price * item.quantity + (item.toppings?.length || 0) * 50 * item.quantity, 0);

  const filteredProducts = useMemo(() => products.filter(p => {
    const query = search.toLowerCase();
    const matchesText = !query || `${p.name} ${p.nameZh} ${p.category}`.toLowerCase().includes(query);
    const matchesFilter = filter === "All" || p.category === filter || (filter === "Drinks" && p.kind === "drink") || (filter === "Goods" && p.kind === "goods");
    return matchesText && matchesFilter;
  }), [search, filter]);

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
    const now = new Date();
    const timeToken = now.getTime().toString(36).toUpperCase();
    const order: Order = {
      id: `KYO-${now.getFullYear().toString().slice(-2)}${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getTime()).slice(-4)}`,
      createdAt: now.toISOString(), status: "Placed", channel, storeId, total: subtotal, items: cart,
      pickupCode: timeToken.slice(-8).padStart(8, "K"),
    };
    setOrders([order, ...orders]); setCart([]); setCheckout(false); setSuccess(order);
  };

  const go = (next: Tab) => { setTab(next); window.scrollTo({ top: 0, behavior: "smooth" }); };

  return (
    <div className="app-shell">
      <div className="top-strip"><span>NAIROBI, KENYA</span><span>FRESHLY MADE · PLAYFULLY SERVED</span><span>EST. WITH JOY</span></div>
      <header className="site-header">
        <button className="store-button" onClick={() => setStoreModal(true)}><span>⌖</span><span><small>{t.location}</small><strong>{selectedStore.area}⌄</strong></span></button>
        <button className="brand-button" onClick={() => go("home")}><Logo /></button>
        <div className="header-actions"><button className="lang" onClick={() => setLang(lang === "en" ? "zh" : "en")}>{lang === "en" ? "中文" : "EN"}</button><button className="desktop-cart" onClick={() => go("cart")}>BAG <b>{cartCount}</b></button></div>
      </header>
      <nav className="desktop-nav">
        {(Object.keys(t.nav) as Tab[]).map(item => <button key={item} className={tab === item ? "active" : ""} onClick={() => go(item)}>{t.nav[item]}{item === "cart" && cartCount > 0 && <sup>{cartCount}</sup>}</button>)}
      </nav>

      <main>
        {tab === "home" && <>
          <section className="hero">
            <div className="hero-copy"><span className="sticker">{t.heroKicker}</span><h1>{t.heroTitle.split("\n").map((line, i) => <span key={i}>{line}</span>)}</h1><p>{t.heroBody}</p><div className="hero-actions"><button className="primary" onClick={() => go("shop")}>{t.orderDrink} →</button><button className="text-button" onClick={() => { setFilter("Goods"); go("shop"); }}>{t.shopDrop}</button></div><div className="scribble">GOOD MOOD<br />IN EVERY CUP ↗</div></div>
            <div className="hero-art"><img src="/images/events/refresh.jpg" alt="KIYOYO fruit drinks campaign" /><div className="hero-burst">NEW<br />DROP!</div><div className="hero-number">01</div></div>
          </section>
          <div className="marquee"><div>BOBA · SOUFFLÉ · HAPPY THINGS · NAIROBI · BOBA · SOUFFLÉ · HAPPY THINGS · NAIROBI ·</div></div>
          <section className="content-section"><SectionHead title={t.trending} action={t.seeAll} onAction={() => go("shop")} /><div className="product-grid featured">{products.filter(p => p.kind === "drink").slice(0, 4).map(p => <ProductCard key={p.id} product={p} lang={lang} saved={saved.includes(p.id)} onSave={() => toggleSave(p.id)} onOpen={() => openProduct(p)} />)}</div></section>
          <section className="story-band"><div className="story-photo"><img src="/images/goods/streetwear.png" alt="KIYOYO streetwear" /></div><div className="story-copy"><span className="eyebrow">KIYOYO WORLD / 001</span><h2>{lang === "zh" ? "不只是一杯奶茶。" : "More than a cup."}</h2><p>{lang === "zh" ? "我们把内罗毕的能量装进饮品、衣服、家居和每一个小小收藏。" : "We bottle Nairobi energy into drinks, clothes, spaces and tiny objects worth keeping."}</p><button className="primary invert" onClick={() => { setFilter("Goods"); go("shop"); }}>{t.shopDrop} →</button></div></section>
          <section className="content-section"><SectionHead title={t.goods} action={t.seeAll} onAction={() => { setFilter("Goods"); go("shop"); }} /><div className="editorial-grid">{products.filter(p => p.kind === "goods").slice(0, 5).map((p, i) => <div className={`editorial-card e${i}`} key={p.id}><ProductCard product={p} lang={lang} saved={saved.includes(p.id)} onSave={() => toggleSave(p.id)} onOpen={() => openProduct(p)} /></div>)}</div></section>
        </>}

        {tab === "shop" && <section className="shop-page content-section">
          <div className="page-heading"><span className="sticker">KIYOYO MARKET</span><h1>{lang === "zh" ? "今天想要什么？" : "Pick your happy."}</h1><p>{lang === "zh" ? "先来一杯，再带点快乐回家。" : "Start with a sip. Leave with a little joy."}</p></div>
          <div className="shop-tools"><label className="search-box"><span>⌕</span><input value={search} onChange={e => setSearch(e.target.value)} placeholder={t.search} /></label><div className="filters">{["All", "Drinks", "Goods", "Milk Tea", "Fruit Tea", "Fashion", "Home", "Outdoor", "Pets"].map(f => <button key={f} className={filter === f ? "active" : ""} onClick={() => setFilter(f)}>{f === "All" ? t.all : f}</button>)}</div></div>
          <div className="product-grid">{filteredProducts.map(p => <ProductCard key={p.id} product={p} lang={lang} saved={saved.includes(p.id)} onSave={() => toggleSave(p.id)} onOpen={() => openProduct(p)} />)}</div>
        </section>}

        {tab === "collection" && <section className="content-section collection-page"><div className="page-heading"><span className="sticker">♡ YOURS</span><h1>{t.collectionTitle}</h1><p>{t.collectionSub}</p></div>{saved.length ? <div className="product-grid">{products.filter(p => saved.includes(p.id)).map(p => <ProductCard key={p.id} product={p} lang={lang} saved onSave={() => toggleSave(p.id)} onOpen={() => openProduct(p)} />)}</div> : <div className="empty-state"><span>♡</span><p>{t.emptySaved}</p><button className="primary" onClick={() => go("shop")}>{t.explore}</button></div>}</section>}

        {tab === "cart" && <section className="content-section cart-page"><div className="page-heading"><span className="sticker">{cartCount} ITEMS</span><h1>{t.cartTitle}</h1></div>{!cart.length ? <div className="empty-state"><span>▱</span><p>{t.emptyCart}</p><button className="primary" onClick={() => go("shop")}>{t.explore}</button></div> : <div className="cart-layout"><div className="cart-list">{detailedCart.map(item => <article className="cart-row" key={item.key}><img src={item.product.image} alt={item.product.name} /><div className="cart-name"><span className="eyebrow">{item.product.kind === "drink" ? t.drinks : t.merch}</span><h3>{lang === "zh" ? item.product.nameZh : item.product.name}</h3>{item.product.kind === "drink" && <small>{item.size} · {item.sugar} · {item.ice}{item.toppings?.length ? ` · ${item.toppings.join(", ")}` : ""}</small>}<strong>{money(item.product.price + (item.toppings?.length || 0) * 50)}</strong></div><div className="qty"><button onClick={() => updateQty(item.key, -1)}>−</button><span>{item.quantity}</span><button onClick={() => updateQty(item.key, 1)}>+</button></div></article>)}</div><aside className="cart-summary"><h2>{lang === "zh" ? "订单概要" : "Order summary"}</h2><div><span>{t.subtotal}</span><strong>{money(subtotal)}</strong></div><div><span>{lang === "zh" ? "配送费" : "Delivery"}</span><span>{lang === "zh" ? "结账时计算" : "Calculated next"}</span></div><button className="primary full" onClick={() => setCheckout(true)}>{t.checkout} →</button><small>{t.mockNotice}</small></aside></div>}</section>}

        {tab === "account" && <section className="account-page content-section"><div className="member-card"><div><span>{t.member}</span><h1>{t.memberHello}</h1><small>{t.points}</small><strong>2,480</strong></div><Logo /><i>VIP</i></div><div className="account-tabs"><button className="active">{t.coupons}</button><button>{t.rewards}</button><button>{t.history}</button></div><div className="coupon-grid"><article><b>20%</b><div><strong>ALL DRINKS</strong><span>MIN. SPEND KSh 800</span></div><button>USE</button></article><article className="gold"><b>2×</b><div><strong>DOUBLE POINTS</strong><span>FRIDAY AFTER 4PM</span></div><button>USE</button></article><article className="dark"><b>FREE</b><div><strong>SIZE UPGRADE</strong><span>MEMBER TREAT</span></div><button>USE</button></article></div><SectionHead title={t.history} />{orders.length ? <div className="order-history">{orders.map(o => <article key={o.id}><div><strong>{o.id}</strong><span>{new Date(o.createdAt).toLocaleString(lang === "zh" ? "zh-CN" : "en-KE", { dateStyle: "medium", timeStyle: "short" })}</span></div><div><span className="status">{o.status}</span><strong>{money(o.total)}</strong></div></article>)}</div> : <div className="order-empty">{t.noOrders}</div>}<a className="admin-link" href="/admin">⚙ {t.admin} →</a></section>}
      </main>

      <nav className="mobile-nav">{(Object.keys(t.nav) as Tab[]).map(item => <button key={item} className={tab === item ? "active" : ""} onClick={() => go(item)}><i>{navIcons[item]}</i><span>{t.nav[item]}</span>{item === "cart" && cartCount > 0 && <b>{cartCount}</b>}</button>)}</nav>

      {modalProduct && <div className="modal-backdrop" onMouseDown={e => e.currentTarget === e.target && setModalProduct(null)}><div className="product-modal"><button className="modal-close" onClick={() => setModalProduct(null)}>×</button><div className="modal-image"><img src={modalProduct.image} alt={modalProduct.name} />{modalProduct.badge && <span className="badge">{modalProduct.badge}</span>}</div><div className="modal-copy"><span className="eyebrow">{modalProduct.category}</span><h2>{lang === "zh" ? modalProduct.nameZh : modalProduct.name}</h2><p>{lang === "zh" ? modalProduct.descriptionZh : modalProduct.description}</p><strong className="modal-price">{money(modalProduct.price)}</strong>{modalProduct.kind === "drink" && <div className="custom-options"><Option title={t.size} options={["Regular", "Large +80"]} value={custom.size} onChange={size => setCustom({ ...custom, size })} /><Option title={t.sugar} options={["0%", "30%", "50%", "100%"]} value={custom.sugar} onChange={sugar => setCustom({ ...custom, sugar })} /><Option title={t.ice} options={["No ice", "Less ice", "Regular"]} value={custom.ice} onChange={ice => setCustom({ ...custom, ice })} /><div className="option-group"><b>{t.toppings} <small>+ KSh 50</small></b><div>{["Boba", "Coconut jelly", "Milk cap"].map(top => <button key={top} className={custom.toppings.includes(top) ? "active" : ""} onClick={() => setCustom({ ...custom, toppings: custom.toppings.includes(top) ? custom.toppings.filter(x => x !== top) : [...custom.toppings, top] })}>{top}</button>)}</div></div></div>}<button className="primary full" onClick={addProduct}>{t.addCart} · {money(modalProduct.price + custom.toppings.length * 50)}</button></div></div></div>}

      {storeModal && <div className="modal-backdrop" onMouseDown={e => e.currentTarget === e.target && setStoreModal(false)}><div className="store-modal"><button className="modal-close" onClick={() => setStoreModal(false)}>×</button><span className="sticker">6 NAIROBI STORES</span><h2>{t.storeTitle}</h2><p>{t.storeSub}</p><button className="locate-button" onClick={locate} disabled={locating}>⌖ {locating ? "Locating…" : t.useLocation}</button>{locationError && <small className="error">{t.locationDenied}</small>}<div className="store-list">{stores.map((store, index) => <button key={store.id} disabled={!store.lat} className={store.id === storeId ? "selected" : ""} onClick={() => { setStoreId(store.id); setStoreModal(false); }}><span className="store-index">0{index + 1}</span><span><strong>{store.name}</strong><small>{store.address}</small><em>{store.verified ? store.phone : t.unverified}</em></span>{distances[store.id] !== undefined && <b>{distances[store.id].toFixed(1)} km{Object.values(distances).sort((a, b) => a - b)[0] === distances[store.id] ? ` · ${t.closest}` : ""}</b>}</button>)}</div></div></div>}

      {checkout && <div className="modal-backdrop"><div className="checkout-modal"><button className="modal-close" onClick={() => setCheckout(false)}>×</button><span className="sticker">TEST CHECKOUT</span><h2>{t.checkoutTitle}</h2><p>{selectedStore.name} · {money(subtotal)}</p><div className="fulfilment-cards"><button onClick={() => placeOrder("Pickup")}><i>⌂</i><strong>{t.pickup}</strong><span>{t.pickupNote}</span></button><button onClick={() => placeOrder("Delivery")}><i>⌁</i><strong>{t.delivery}</strong><span>{t.deliveryNote}</span></button>{detailedCart.some(x => x.product.kind === "goods") && <button onClick={() => placeOrder("Shipping")}><i>▧</i><strong>{t.shipping}</strong><span>Nairobi shipping demo</span></button>}</div><small className="mock-note">ⓘ {t.mockNotice}</small></div></div>}

      {success && <div className="modal-backdrop"><div className="success-modal"><span className="success-pop">✓</span><h2>{t.success}</h2><strong className="order-number">{success.id}</strong><PseudoQR code={success.pickupCode} /><code>{success.pickupCode}</code><p>{success.channel === "Pickup" ? t.qrHelp : `${success.channel} · ${selectedStore.name}`}</p><button className="primary full" onClick={() => { setSuccess(null); go("home"); }}>{t.done}</button></div></div>}
    </div>
  );
}

function Option({ title, options, value, onChange }: { title: string; options: string[]; value: string; onChange: (value: string) => void }) {
  return <div className="option-group"><b>{title}</b><div>{options.map(option => <button key={option} className={value === option ? "active" : ""} onClick={() => onChange(option)}>{option}</button>)}</div></div>;
}
