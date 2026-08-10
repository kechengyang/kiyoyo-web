/* eslint-disable @next/next/no-img-element -- Local prototype assets retain original campaign cropping. */

import type { Dispatch, RefObject, SetStateAction } from "react";
import { drinkCategoryOrder, drinkCategoryZh } from "../../menu";
import type { Lang, Product } from "../../types";
import { drinkCategoryAnchor } from "./foundation";
import { DrinkMenuCard, Logo, ProductCard } from "./primitives";

export function ShopView({
  lang, shopMode, openShop, setStoreModal, storeArea, drinkCategoryNavRef,
  filter, products, jumpToDrinkCategory, drinkGroups, saved, toggleSave,
  openProduct, setFilter, filteredProducts,
}: {
  lang: Lang;
  shopMode: "drinks" | "goods";
  openShop: (mode: "drinks" | "goods", filter?: string) => void;
  setStoreModal: Dispatch<SetStateAction<boolean>>;
  storeArea: string;
  drinkCategoryNavRef: RefObject<HTMLElement | null>;
  filter: string;
  products: Product[];
  jumpToDrinkCategory: (category: string) => void;
  drinkGroups: Array<{
    category: (typeof drinkCategoryOrder)[number];
    products: Product[];
  }>;
  saved: string[];
  toggleSave: (productId: string) => void;
  openProduct: (product: Product) => void;
  setFilter: Dispatch<SetStateAction<string>>;
  filteredProducts: Product[];
}) {
  const selectedStore = { area: storeArea };
  return (
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
  );
}
