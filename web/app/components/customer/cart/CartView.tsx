/* eslint-disable @next/next/no-img-element -- Local prototype assets retain original campaign cropping. */

import { addOnsPrice, salePrice } from "../../../catalog";
import { money } from "../../../data";
import type { AuthSession, CartItem, Lang, Product } from "../../../types";
import type { CustomerCopy } from "../core/copy";
import { SavedShelf } from "../saved/SavedView";

type DetailedCartItem = CartItem & { product: Product };

export function CartView({
  t, lang, cart, cartCount, detailedCart, catalog, updateQty, subtotal,
  hasUnavailable, beginCheckout, session, onExplore, saved, products,
  toggleSave, openProduct,
}: {
  t: CustomerCopy;
  lang: Lang;
  cart: CartItem[];
  cartCount: number;
  detailedCart: DetailedCartItem[];
  catalog: Product[];
  updateQty: (key: string, delta: number) => void;
  subtotal: number;
  hasUnavailable: boolean;
  beginCheckout: () => void;
  session: AuthSession | null;
  onExplore: () => void;
  saved: string[];
  products: Product[];
  toggleSave: (productId: string) => void;
  openProduct: (product: Product) => void;
}) {
  return (
<>
<section className="content-section cart-page">
  <div className="page-heading">
    <span className="sticker">{cartCount} ITEMS</span>
    <h1>{t.cartTitle}</h1>
  </div>
  {!cart.length ? (
    <div className="empty-state">
      <span>▱</span>
      <p>{t.emptyCart}</p>
      <button className="primary" onClick={onExplore}>
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
                  {item.addOns?.length
                    ? ` · ${item.addOns
                        .map((uid) => {
                          const name = item.product.pospalTastes?.find(
                            (taste) => taste.uid === uid,
                          )?.attributeName;
                          if (!name) return undefined;
                          return lang === "zh"
                            ? (t.tasteLabels?.[name] ?? name)
                            : name;
                        })
                        .filter(Boolean)
                        .join(", ")}`
                    : ""}
                </small>
              )}
              <strong>
                {money(
                  salePrice(item.product, item.size) +
                    addOnsPrice(item.product, item) +
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
<SavedShelf
  t={t}
  lang={lang}
  saved={saved}
  products={products}
  toggleSave={toggleSave}
  openProduct={openProduct}
  onExplore={onExplore}
/>
</>
  );
}
