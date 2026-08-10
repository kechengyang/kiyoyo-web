/* eslint-disable @next/next/no-img-element -- Local prototype assets retain original campaign cropping. */

import type { Dispatch, SetStateAction } from "react";
import { salePrice } from "../../catalog";
import { money } from "../../data";
import type { Lang, Product } from "../../types";
import type { CustomerCopy } from "./copy";
import { DialogBackdrop } from "./DialogBackdrop";
import { Logo } from "./primitives";

export function GlobalSearchDialog({
  lang, t, globalQuery, setGlobalQuery, normalizedGlobalQuery, globalResults,
  setGlobalSearchOpen, openProduct,
}: {
  lang: Lang;
  t: CustomerCopy;
  globalQuery: string;
  setGlobalQuery: Dispatch<SetStateAction<string>>;
  normalizedGlobalQuery: string;
  globalResults: Product[];
  setGlobalSearchOpen: Dispatch<SetStateAction<boolean>>;
  openProduct: (product: Product) => void;
}) {
  return (
<DialogBackdrop
  baseClassName="global-search-overlay"
  closeOnBackdrop
  labelledBy="global-search-title"
  onClose={() => setGlobalSearchOpen(false)}
>
  <section
    className="global-search-panel"
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
</DialogBackdrop>
  );
}
