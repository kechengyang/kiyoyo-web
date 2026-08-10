/* eslint-disable @next/next/no-img-element -- Local prototype assets retain original campaign cropping. */

import type { Dispatch, SetStateAction } from "react";
import { salePrice } from "../../../catalog";
import { money } from "../../../data";
import type { Lang, Product } from "../../../types";
import type { CustomerCopy } from "../core/copy";
import { DialogBackdrop } from "../shared/DialogBackdrop";
import { Option, productSizeEntries } from "../shared/primitives";

export type DrinkCustomisation = {
  size: string;
  sugar: string;
  ice: string;
  toppings: string[];
};

export function ProductDialog({
  modalProduct, setModalProduct, lang, t, custom, setCustom, addOnProducts, addProduct,
}: {
  modalProduct: Product;
  setModalProduct: Dispatch<SetStateAction<Product | null>>;
  lang: Lang;
  t: CustomerCopy;
  custom: DrinkCustomisation;
  setCustom: Dispatch<SetStateAction<DrinkCustomisation>>;
  addOnProducts: Product[];
  addProduct: () => void;
}) {
  return (
<DialogBackdrop closeOnBackdrop onClose={() => setModalProduct(null)}>
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
</DialogBackdrop>
  );
}
