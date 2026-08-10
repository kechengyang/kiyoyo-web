/* eslint-disable @next/next/no-img-element -- Tiny admin thumbnails do not need image optimization. */

import type { Dispatch, SetStateAction } from "react";
import { salePrice } from "../../catalog";
import { money } from "../../data";
import { drinkCategoryOrder } from "../../menu";
import type { Product, ProductTag } from "../../types";
import { goodsCategoryOrder } from "../core/foundation";

export function ProductEditorDialog({
  editingProduct, setEditingProduct, updateProductImage, productTags,
  productError, saveProduct,
}: {
  editingProduct: Product;
  setEditingProduct: Dispatch<SetStateAction<Product | null>>;
  updateProductImage: (file?: File) => void;
  productTags: ProductTag[];
  productError: string;
  saveProduct: () => void;
}) {
  return (
<div className="modal-backdrop">
  <div className="admin-product-modal">
    <button
      className="modal-close"
      onClick={() => setEditingProduct(null)}
    >
      ×
    </button>
    <span className="red-label">EDIT PRODUCT</span>
    <h2>{editingProduct.name}</h2>
    <div className="product-image-editor">
      <img src={editingProduct.image} alt="Product preview" />
      <label>
        <strong>Replace image</strong>
        <span>JPG, PNG or WebP · signed Cloud Storage upload</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => updateProductImage(e.target.files?.[0])}
        />
      </label>
    </div>
    <label className="form-field">
      <span>Image path / URL</span>
      <input
        value={editingProduct.image}
        onChange={(e) =>
          setEditingProduct({
            ...editingProduct,
            image: e.target.value,
          })
        }
      />
    </label>
    <div className="form-split">
      <label className="form-field">
        <span>Product type</span>
        <input value={editingProduct.kind} disabled />
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
    {productError && <div className="form-error">{productError}</div>}
    <button className="primary full" onClick={saveProduct}>
      Save & sync →
    </button>
    <small className="admin-sync-note">
      Product data is stored in Cloud SQL; uploaded images use the
      private KIYOYO media bucket.
    </small>
  </div>
</div>
  );
}
