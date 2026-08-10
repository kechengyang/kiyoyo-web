/* eslint-disable @next/next/no-img-element -- Local prototype assets retain original campaign cropping. */

import QRCode from "react-qr-code";
import { salePrice } from "../../../catalog";
import { money } from "../../../data";
import type { Lang, Product, Tab } from "../../../types";

export function Logo() {
  return <span className="logo">KIYOYO</span>;
}

export function NavIcon({ item }: { item: Tab }) {
  return (
    <span className={`nav-mark nav-${item}`} aria-hidden="true">
      <i />
      <em />
    </span>
  );
}

export const productSizeEntries = (product: Product) =>
  Object.entries(product.sizePrices ?? { "One size": product.price }).sort(
    ([first], [second]) =>
      (["M", "L", "One size"].indexOf(first) + 3) % 3 -
      ((["M", "L", "One size"].indexOf(second) + 3) % 3),
  );

export function ProductCard({
  product,
  lang,
  saved,
  onSave,
  onOpen,
  drinkShop = false,
}: {
  product: Product;
  lang: Lang;
  saved: boolean;
  onSave: () => void;
  onOpen: () => void;
  drinkShop?: boolean;
}) {
  return (
    <article className={`product-card ${product.kind === "drink" ? "drink-product" : "goods-product"}`}>
      <button className="product-image" onClick={onOpen} aria-label={`Open ${product.name}`}>
        <img src={product.image} alt={lang === "zh" ? product.nameZh : product.name} />
        {(product.discountPercent || 0) > 0 ? (
          <span className="badge sale-badge">−{product.discountPercent}%</span>
        ) : (
          product.badge && <span className="badge" data-tone={product.badgeTone || "red"}>{product.badge}</span>
        )}
      </button>
      <div className="product-info">
        <div>
          <span className="eyebrow">{product.category}</span>
          <h3>{lang === "zh" ? product.nameZh : product.name}</h3>
        </div>
        <button className={`heart ${saved ? "saved" : ""}`} onClick={onSave} aria-label="Save product">
          {saved ? "♥" : "♡"}
        </button>
      </div>
      <div className="product-bottom">
        <span className="card-price">
          <strong>{money(salePrice(product))}</strong>
          {(product.discountPercent || 0) > 0 && <del>{money(product.price)}</del>}
        </span>
        <button className={drinkShop ? "customise-card" : "round-add"} onClick={onOpen}>
          {drinkShop ? (lang === "zh" ? "定制 →" : "Customise →") : "+"}
        </button>
      </div>
    </article>
  );
}

export function DrinkMenuCard({ product, lang, saved, onSave, onOpen }: {
  product: Product;
  lang: Lang;
  saved: boolean;
  onSave: () => void;
  onOpen: () => void;
}) {
  const prices = productSizeEntries(product);
  return (
    <article className="drink-menu-card">
      <button className="drink-menu-image" onClick={onOpen} aria-label={`Open ${product.name}`}>
        <img src={product.image} alt={lang === "zh" ? product.nameZh : product.name} loading="lazy" decoding="async" />
        {product.badge && <span className="drink-menu-badge">{product.badge}</span>}
      </button>
      <div className="drink-menu-copy">
        <div className="drink-menu-title">
          <span>{product.id}</span>
          <h3>{lang === "zh" ? product.nameZh : product.name}</h3>
          <button className={`heart ${saved ? "saved" : ""}`} onClick={onSave} aria-label="Save product">
            {saved ? "♥" : "♡"}
          </button>
        </div>
        <p>{lang === "zh" ? product.descriptionZh : product.description}</p>
        <div className="drink-menu-bottom">
          <div className="drink-size-prices">
            {prices.map(([size, price]) => (
              <span key={size || "price"}>
                {size && size !== "One size" && <small>{size}</small>}
                {money(Math.round(price * (1 - (product.discountPercent || 0) / 100)))}
              </span>
            ))}
          </div>
          <button onClick={onOpen}>
            {product.category === "Add-ons"
              ? lang === "zh" ? "加入" : "Add"
              : lang === "zh" ? "选规格" : "Choose"}
          </button>
        </div>
      </div>
    </article>
  );
}

export function SectionHead({ title, action, onAction }: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="section-head">
      <h2>{title}</h2>
      {action && <button onClick={onAction}>{action} →</button>}
    </div>
  );
}

export function PickupQR({ code }: { code: string }) {
  return (
    <div className="qr" aria-label={`Pickup code ${code}`}>
      <QRCode value={code} size={180} level="M" bgColor="#ffffff" fgColor="#171412" title={`Pickup code ${code}`} />
    </div>
  );
}

export function Option({ title, options, value, onChange }: {
  title: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="option-group">
      <b>{title}</b>
      <div>
        {options.map((option) => (
          <button key={option} className={value === option ? "active" : ""} onClick={() => onChange(option)}>
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
