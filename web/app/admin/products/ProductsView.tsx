/* eslint-disable @next/next/no-img-element -- Tiny admin thumbnails do not need image optimization. */

import type { Dispatch, SetStateAction } from "react";
import { resolveProductTag, salePrice } from "../../catalog";
import { money } from "../../data";
import type { PospalSyncDiff, Product, ProductTag, ProductTagTone } from "../../types";

export function ProductsView({
  catalog, productTags, showTagManager, setShowTagManager, newTag, setNewTag,
  addTag, tagError, deleteTag, productSearch, setProductSearch, productKind,
  setProductKind, productCategory, setProductCategory, categoryOptions,
  productVisibility, setProductVisibility,
  shownProducts, toggleProduct, openProductEditor, openNewProductEditor,
  canWrite, syncingPospal, onSyncPospal, canManagePospal,
  pospalSyncDiffs, onClosePospalDiffs,
}: {
  catalog: Product[];
  productTags: ProductTag[];
  showTagManager: boolean;
  setShowTagManager: Dispatch<SetStateAction<boolean>>;
  newTag: { label: string; tone: ProductTagTone };
  setNewTag: Dispatch<SetStateAction<{ label: string; tone: ProductTagTone }>>;
  addTag: () => void;
  tagError: string;
  deleteTag: (id: string) => void;
  productSearch: string;
  setProductSearch: Dispatch<SetStateAction<string>>;
  productKind: "all" | "drink" | "goods";
  setProductKind: Dispatch<SetStateAction<"all" | "drink" | "goods">>;
  productCategory: string;
  setProductCategory: Dispatch<SetStateAction<string>>;
  productVisibility: "alive" | "offline" | "all";
  setProductVisibility: Dispatch<SetStateAction<"alive" | "offline" | "all">>;
  categoryOptions: string[];
  shownProducts: Product[];
  toggleProduct: (id: string) => void;
  openProductEditor: (product: Product) => void;
  openNewProductEditor: () => void;
  canWrite: boolean;
  syncingPospal: boolean;
  onSyncPospal: () => void;
  canManagePospal: boolean;
  pospalSyncDiffs: PospalSyncDiff[];
  onClosePospalDiffs: () => void;
}) {
  return (
<section className="admin-panel wide product-management">
  <div className="product-admin-head">
    <div>
      <span className="red-label">LIVE CATALOG</span>
      <h2>Product management</h2>
      <p>
        Changes sync through the Commerce API to every storefront.
      </p>
    </div>
    <div className="catalog-stats">
      <span>
        <b>{catalog.filter((p) => p.active !== false).length}</b> live
      </span>
      <span>
        <b>{productTags.length}</b> tags
      </span>
      {canWrite && <button onClick={() => setShowTagManager(!showTagManager)}>{showTagManager ? "Close tags" : "Manage tags"} →</button>}
      {canWrite && <button className="new-product" onClick={openNewProductEditor}>+ New product</button>}
      {canManagePospal && (
        <button onClick={onSyncPospal} disabled={syncingPospal}>
          {syncingPospal ? "Syncing…" : "Sync with POSPAL"}
        </button>
      )}
    </div>
  </div>
  {pospalSyncDiffs.length > 0 && (
    <section className="tag-manager">
      <div>
        <span className="red-label">POSPAL SYNC REVIEW</span>
        <h3>{pospalSyncDiffs.length} changes applied from POSPAL</h3>
        <p>
          Review the changes below. To keep a product’s manual values
          (online vs in-store differences), open it and enable “Manual
          override (skip POSPAL sync)”.
        </p>
      </div>
      <button onClick={onClosePospalDiffs}>Dismiss</button>
      <div className="pospal-diff-list">
        {pospalSyncDiffs.map((diff) => (
          <article key={`${diff.barcode}-${diff.name}`}>
            <strong>{diff.name}</strong>
            {diff.oldName != null && (
              <span>
                Name: {diff.oldName} → {diff.newName}
              </span>
            )}
            {diff.oldBasePrice != null && (
              <span>
                Price: KSh {diff.oldBasePrice} → {diff.newBasePrice}
              </span>
            )}
            {diff.oldCategorySlug != null && (
              <span>
                Category: {diff.oldCategorySlug} → {diff.newCategorySlug}
              </span>
            )}
          </article>
        ))}
      </div>
    </section>
  )}
  {canWrite && showTagManager && (
    <section className="tag-manager">
      <div>
        <span className="red-label">TAG LIBRARY</span>
        <h3>Create and define product tags</h3>
        <p>
          Tags are reusable. Assign one from each product’s edit
          panel.
        </p>
      </div>
      <div className="tag-creator">
        <input
          maxLength={18}
          value={newTag.label}
          onChange={(e) =>
            setNewTag({ ...newTag, label: e.target.value })
          }
          onKeyDown={(e) => e.key === "Enter" && addTag()}
          placeholder="e.g. DROP 01"
        />
        <select
          value={newTag.tone}
          onChange={(e) =>
            setNewTag({
              ...newTag,
              tone: e.target.value as ProductTagTone,
            })
          }
        >
          <option value="red">KIYOYO red</option>
          <option value="yellow">Highlight yellow</option>
          <option value="black">Studio black</option>
          <option value="green">Fresh green</option>
        </select>
        <span className="tag-chip" data-tone={newTag.tone}>
          {newTag.label.trim().toUpperCase() || "PREVIEW"}
        </span>
        <button onClick={addTag}>+ Create tag</button>
      </div>
      {tagError && <div className="form-error">{tagError}</div>}
      <div className="tag-library">
        {productTags.map((tag) => (
          <span key={tag.id}>
            <em className="tag-chip" data-tone={tag.tone}>
              {tag.label}
            </em>
            <small>
              {
                catalog.filter(
                  (product) =>
                    product.tagId === tag.id ||
                    (!product.tagId &&
                      product.badge?.toLowerCase() ===
                        tag.label.toLowerCase()),
                ).length
              }{" "}
              products
            </small>
            <button
              aria-label={`Delete ${tag.label}`}
              onClick={() => deleteTag(tag.id)}
            >
              ×
            </button>
          </span>
        ))}
      </div>
    </section>
  )}
  <div className="product-admin-tools">
    <label>
      <span>⌕</span>
      <input
        value={productSearch}
        onChange={(e) => setProductSearch(e.target.value)}
        placeholder="Search products"
      />
    </label>
    <div>
      {(["all", "drink", "goods"] as const).map((kind) => (
        <button
          key={kind}
          className={productKind === kind ? "active" : ""}
          onClick={() => {
            setProductKind(kind);
            setProductCategory("all");
          }}
        >
          {kind}
        </button>
      ))}
      <select
        aria-label="Filter products by category"
        value={productCategory}
        onChange={(event) => setProductCategory(event.target.value)}
      >
        <option value="all">All categories</option>
        {categoryOptions.map((category) => (
          <option key={category} value={category}>
            {category}
          </option>
        ))}
      </select>
    </div>
  </div>
  <div className="admin-product-list">
    <div className="product-list-head">
      <span>Product</span>
      <span>Price</span>
      <span>Offer / tag</span>
      <label className="product-visibility-filter">
        <span>Visibility</span>
        <select
          aria-label="Filter products by visibility"
          value={productVisibility}
          onChange={(event) =>
            setProductVisibility(
              event.target.value as "alive" | "offline" | "all",
            )
          }
        >
          <option value="alive">Alive</option>
          <option value="offline">Offline</option>
          <option value="all">All</option>
        </select>
      </label>
      <span>Action</span>
      <span>Pospal</span>
    </div>
    {shownProducts.map((product) => {
      const assignedTag = resolveProductTag(product, productTags);
      return (
        <article
          key={product.id}
          className={product.active === false ? "offline" : ""}
        >
          <span className="admin-product-name">
            {product.image ? (
              <img src={product.image} alt="" />
            ) : (
              <span className="admin-product-placeholder" aria-hidden="true">
                No image
              </span>
            )}
            <span>
              <strong>{product.name}</strong>
              <small>
                {product.nameZh} · {product.category}
              </small>
            </span>
          </span>
          <span className="admin-price">
            <strong>{money(salePrice(product))}</strong>
            {(product.discountPercent || 0) > 0 && (
              <del>{money(product.price)}</del>
            )}
          </span>
          <span>
            {(product.discountPercent || 0) > 0 ? (
              <em className="offer-pill">
                −{product.discountPercent}%
              </em>
            ) : assignedTag ? (
              <em className="tag-chip" data-tone={assignedTag.tone}>
                {assignedTag.label}
              </em>
            ) : (
              <small>—</small>
            )}
          </span>
          <span>
            {canWrite ? <button className={`publish-toggle ${product.active === false ? "off" : ""}`} onClick={() => toggleProduct(product.id)}><i />{product.active === false ? "Offline" : "Live"}</button> : <em className={`catalog-viewer-status ${product.active === false ? "offline" : "live"}`}>{product.active === false ? "Offline" : "Live"}</em>}
          </span>
          <span>
            {canWrite ? <button className="edit-product" onClick={() => openProductEditor(product)}>Edit →</button> : <small>Viewer</small>}
          </span>
          <span>
            {product.pospalUid ? (
              <em
                className="pospal-sync-mark synced"
                title={`${product.pospalName ?? ""} · ${money((product.pospalSellPriceCents ?? 0) / 100)} · ${product.pospalBarcode ?? ""}`}
              >
                {product.pospalBarcode || "✓"}
              </em>
            ) : (
              <em className="pospal-sync-mark pending" title="Not found in POSPAL dictionary — run Sync with POSPAL or set the POSPAL barcode in the product editor">
                —
              </em>
            )}
          </span>
        </article>
      );
    })}
    {shownProducts.length === 0 && (
      <p className="admin-product-empty" role="status">
        No products match the current filters.
      </p>
    )}
  </div>
</section>
  );
}
