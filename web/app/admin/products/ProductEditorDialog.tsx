/* eslint-disable @next/next/no-img-element -- Tiny admin thumbnails do not need image optimization. */

import type { Dispatch, SetStateAction } from "react";
import { salePrice } from "../../catalog";
import { money } from "../../data";
import { drinkCategoryOrder } from "../../menu";
import type { Product, ProductTag } from "../../types";
import { goodsCategoryOrder } from "../core/foundation";

export function ProductEditorDialog({
  editingProduct, setEditingProduct, updateProductImage, productTags,
  productError, saveProduct, productBusy, productProgress, productUploadPercent,
}: {
  editingProduct: Product;
  setEditingProduct: Dispatch<SetStateAction<Product | null>>;
  updateProductImage: (file?: File) => void;
  productTags: ProductTag[];
  productError: string;
  saveProduct: () => void;
  productBusy: boolean;
  productProgress: string;
  productUploadPercent: number | null;
}) {
  const isNew = !editingProduct.apiId;
  // 银豹为商品唯一数据源,但 Admin 始终可手动编辑(线上/线下不一致的例外);
  // 手动锁定开关决定下次同步是否覆盖
  const isPospalManaged = Boolean(editingProduct.pospalUid);
  return (
<div className="modal-backdrop">
  <div className="admin-product-modal" role="dialog" aria-modal="true" aria-labelledby="product-editor-title">
    <button
      className="modal-close"
      onClick={() => setEditingProduct(null)}
      aria-label="Close product editor"
      disabled={productBusy}
    >
      ×
    </button>
    <span className="red-label">{isNew ? "NEW PRODUCT" : "EDIT PRODUCT"}</span>
    <h2 id="product-editor-title">{editingProduct.name || "Create product"}</h2>
    {isPospalManaged && (
      <small className="admin-pospal-note">
        POSPAL-linked — name, category and base price sync from POSPAL. To
        keep manual values across syncs, enable the manual override below.
      </small>
    )}
    <div className="product-image-editor">
      {editingProduct.image ? (
        <img src={editingProduct.image} alt="Product preview" />
      ) : (
        <div className="product-image-placeholder">Upload required</div>
      )}
      <label>
        <strong>{editingProduct.image ? "Replace image" : "Upload image"}</strong>
        <span>JPG, PNG or WebP · maximum 8 MB · secure Cloud Storage upload</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => updateProductImage(e.target.files?.[0])}
        />
      </label>
    </div>
    <label className="form-field">
      <span>Cloud Storage bucket path</span>
      <input
        value={editingProduct.imageKey ?? (editingProduct.image ? "Pending secure upload" : "Upload required")}
        readOnly
        aria-describedby="bucket-path-help"
      />
      <small id="bucket-path-help">The path is assigned by the API after GCS verifies the upload.</small>
    </label>
    <div className="form-split">
      <label className="form-field">
        <span>Product type</span>
        {isNew ? (
          <select
            value={editingProduct.kind}
            onChange={(event) => {
              const kind = event.target.value as Product["kind"];
              setEditingProduct({
                ...editingProduct,
                kind,
                category: kind === "drink" ? drinkCategoryOrder[0] : goodsCategoryOrder[0],
              });
            }}
          >
            <option value="drink">Drink</option>
            <option value="goods">Goods</option>
          </select>
        ) : (
          <input value={editingProduct.kind} disabled />
        )}
      </label>
      <label className="form-field">
        <span>Category</span>
        <select
          value={editingProduct.category}
          onChange={(event) =>
            setEditingProduct({
              ...editingProduct,
              category: event.target.value,
            })
          }
        >
          {(editingProduct.kind === "drink"
            ? drinkCategoryOrder
            : goodsCategoryOrder
          ).map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
          {!(editingProduct.kind === "drink"
            ? drinkCategoryOrder
            : goodsCategoryOrder
          ).some(
            (category) => category === editingProduct.category,
          ) && (
            <option value={editingProduct.category}>
              {editingProduct.category}
            </option>
          )}
        </select>
      </label>
    </div>
    <div className="form-split">
      <label className="form-field">
        <span>English description</span>
        <textarea
          value={editingProduct.description}
          onChange={(event) =>
            setEditingProduct({
              ...editingProduct,
              description: event.target.value,
            })
          }
        />
      </label>
      <label className="form-field">
        <span>Chinese description</span>
        <textarea
          value={editingProduct.descriptionZh}
          onChange={(event) =>
            setEditingProduct({
              ...editingProduct,
              descriptionZh: event.target.value,
            })
          }
        />
      </label>
    </div>
    <div className="form-split">
      <label className="form-field">
        <span>English name</span>
        <input
          value={editingProduct.name}
          onChange={(e) =>
            setEditingProduct({
              ...editingProduct,
              name: e.target.value,
            })
          }
        />
      </label>
      <label className="form-field">
        <span>Chinese name</span>
        <input
          value={editingProduct.nameZh}
          onChange={(e) =>
            setEditingProduct({
              ...editingProduct,
              nameZh: e.target.value,
            })
          }
        />
      </label>
    </div>
    <div className="form-split">
      <label className="form-field">
        <span>Base price (KSh)</span>
        <input
          type="number"
          min="1"
          value={editingProduct.price}
          onChange={(e) =>
            setEditingProduct({
              ...editingProduct,
              price: Number(e.target.value),
            })
          }
        />
      </label>
      <label className="form-field">
        <span>Discount %</span>
        <input
          type="number"
          min="0"
          max="90"
          value={editingProduct.discountPercent || 0}
          onChange={(e) =>
            setEditingProduct({
              ...editingProduct,
              discountPercent: Number(e.target.value),
            })
          }
        />
      </label>
    </div>
    <label className="form-field tag-assignment">
      <span>Product tag</span>
      <select
        value={editingProduct.tagId || ""}
        onChange={(e) =>
          setEditingProduct({
            ...editingProduct,
            tagId: e.target.value || undefined,
            badge: undefined,
          })
        }
      >
        <option value="">No tag</option>
        {productTags.map((tag) => (
          <option key={tag.id} value={tag.id}>
            {tag.label} · {tag.tone}
          </option>
        ))}
      </select>
      {editingProduct.tagId &&
        productTags.find((tag) => tag.id === editingProduct.tagId) && (
          <em
            className="tag-chip"
            data-tone={
              productTags.find((tag) => tag.id === editingProduct.tagId)
                ?.tone
            }
          >
            {
              productTags.find((tag) => tag.id === editingProduct.tagId)
                ?.label
            }
          </em>
        )}
      <small>
        Create reusable tags from Manage tags before assigning them.
      </small>
    </label>
    {!isNew && (
      <label className="form-field">
        <span>POSPAL barcode</span>
        <input
          value={editingProduct.pospalBarcode ?? ""}
          onChange={(e) =>
            setEditingProduct({
              ...editingProduct,
              pospalBarcode: e.target.value,
            })
          }
          placeholder="e.g. 0273400877705"
        />
        <small>
          The barcode of the matching item in the POSPAL dictionary. Sync
          links products to POSPAL by this code; a manual change takes effect
          on the next sync.
        </small>
      </label>
    )}
    <div className="sale-preview">
      <span>Customer price</span>
      <strong>{money(salePrice(editingProduct))}</strong>
      {(editingProduct.discountPercent || 0) > 0 && (
        <del>{money(editingProduct.price)}</del>
      )}
    </div>
    <label className="admin-publish-check">
      <input
        type="checkbox"
        checked={editingProduct.active !== false}
        onChange={(e) =>
          setEditingProduct({
            ...editingProduct,
            active: e.target.checked,
          })
        }
      />
      <span>
        <strong>Published on storefront</strong>
        <small>Uncheck to hide this item and block checkout.</small>
      </span>
    </label>
    {isPospalManaged && (
      <label className="admin-publish-check">
        <input
          type="checkbox"
          checked={editingProduct.pospalManualOverride === true}
          onChange={(e) =>
            setEditingProduct({
              ...editingProduct,
              pospalManualOverride: e.target.checked,
            })
          }
        />
        <span>
          <strong>Manual override (skip POSPAL sync)</strong>
          <small>
            Keep this product’s manual values — POSPAL sync will not overwrite
            name, category or price while locked.
          </small>
        </span>
      </label>
    )}
    {productError && <div className="form-error">{productError}</div>}
    {productProgress && (
      <div className="product-upload-status" role="status" aria-live="polite">
        <span>{productProgress}</span>
        {productUploadPercent != null && (
          <progress max="100" value={productUploadPercent}>
            {productUploadPercent}%
          </progress>
        )}
      </div>
    )}
    <button className="primary full" onClick={saveProduct} disabled={productBusy}>
      {productBusy ? "Saving…" : isNew ? "Create & sync →" : "Save & sync →"}
    </button>
    <small className="admin-sync-note">
      Product data is stored in Cloud SQL; uploaded images use the
      private KIYOYO media bucket.
    </small>
  </div>
</div>
  );
}
