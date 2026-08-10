import type { Dispatch, RefObject, SetStateAction } from "react";
import { money } from "../../data";
import type { Product } from "../../types";
import { categorySlug, inputDateTime, nairobiDateTimeIso } from "../core/foundation";
import type { AdminCoupon } from "../core/types";

export function CouponEditorDialog({
  editingCoupon, setEditingCoupon, couponDialogRef, couponBusy, catalog,
  couponError, saveCoupon,
}: {
  editingCoupon: AdminCoupon;
  setEditingCoupon: Dispatch<SetStateAction<AdminCoupon | null>>;
  couponDialogRef: RefObject<HTMLElement | null>;
  couponBusy: boolean;
  catalog: Product[];
  couponError: string;
  saveCoupon: () => void;
}) {
  return (
<div className="modal-backdrop">
  <section ref={couponDialogRef} className="admin-record-modal coupon-editor" role="dialog" aria-modal="true" aria-labelledby="coupon-editor-title">
    <button className="modal-close" aria-label="Close coupon editor" onClick={() => setEditingCoupon(null)}>×</button>
    <span className="red-label">COUPON DRAFT</span>
    <h2 id="coupon-editor-title">{editingCoupon.id ? editingCoupon.name_en : "Create coupon"}</h2>
    <p>Save the rule as a draft. Publishing remains a separate customer-visible action.</p>
    {editingCoupon.redeemed_count > 0 && (
      <div className="admin-info-note">This rule has redemptions and is now read-only. Duplicate it to create a new version.</div>
    )}
    <fieldset disabled={editingCoupon.redeemed_count > 0 || couponBusy}>
      <div className="form-split">
        <label className="form-field">
          <span>Code</span>
          <input value={editingCoupon.code} maxLength={40} placeholder="HAPPY20" onChange={(event) => setEditingCoupon({ ...editingCoupon, code: event.target.value.toUpperCase() })} />
        </label>
        <label className="form-field">
          <span>Distribution</span>
          <select value={editingCoupon.issuance_mode} onChange={(event) => setEditingCoupon({ ...editingCoupon, issuance_mode: event.target.value as AdminCoupon["issuance_mode"] })}>
            <option value="ASSIGNED">Member wallet</option>
            <option value="PUBLIC_CODE">Public code</option>
          </select>
        </label>
      </div>
      <div className="form-split">
        <label className="form-field">
          <span>English name</span>
          <input value={editingCoupon.name_en} onChange={(event) => setEditingCoupon({ ...editingCoupon, name_en: event.target.value })} />
        </label>
        <label className="form-field">
          <span>Chinese name</span>
          <input value={editingCoupon.name_zh} onChange={(event) => setEditingCoupon({ ...editingCoupon, name_zh: event.target.value })} />
        </label>
      </div>
      <div className="form-split">
        <label className="form-field">
          <span>English description</span>
          <textarea value={editingCoupon.description_en} onChange={(event) => setEditingCoupon({ ...editingCoupon, description_en: event.target.value })} />
        </label>
        <label className="form-field">
          <span>Chinese description</span>
          <textarea value={editingCoupon.description_zh} onChange={(event) => setEditingCoupon({ ...editingCoupon, description_zh: event.target.value })} />
        </label>
      </div>
      <div className="form-split three">
        <label className="form-field">
          <span>Offer type</span>
          <select value={editingCoupon.discount_type} onChange={(event) => setEditingCoupon({ ...editingCoupon, discount_type: event.target.value as AdminCoupon["discount_type"], discount_value: event.target.value === "FREE_SIZE_UPGRADE" ? 0 : editingCoupon.discount_value || 10 })}>
            <option value="PERCENT">Percentage</option>
            <option value="FIXED">Fixed amount</option>
            <option value="FREE_SIZE_UPGRADE">Free size upgrade</option>
          </select>
        </label>
        <label className="form-field">
          <span>{editingCoupon.discount_type === "PERCENT" ? "Percentage" : "Amount (KSh)"}</span>
          <input type="number" min="0" max={editingCoupon.discount_type === "PERCENT" ? 100 : undefined} disabled={editingCoupon.discount_type === "FREE_SIZE_UPGRADE"} value={editingCoupon.discount_value} onChange={(event) => setEditingCoupon({ ...editingCoupon, discount_value: Number(event.target.value) })} />
        </label>
        <label className="form-field">
          <span>Maximum discount</span>
          <input type="number" min="0" placeholder="No cap" value={editingCoupon.max_discount ?? ""} onChange={(event) => setEditingCoupon({ ...editingCoupon, max_discount: event.target.value ? Number(event.target.value) : null })} />
        </label>
      </div>
      <div className="form-split three">
        <label className="form-field">
          <span>Applies to</span>
          <select value={editingCoupon.scope_type} onChange={(event) => setEditingCoupon({ ...editingCoupon, scope_type: event.target.value as AdminCoupon["scope_type"], scope_value: null })}>
            <option value="ALL">All products</option>
            <option value="DRINKS">All drinks</option>
            <option value="GOODS">All goods</option>
            <option value="CATEGORY">Category</option>
            <option value="PRODUCT">Product</option>
          </select>
        </label>
        <label className="form-field">
          <span>Scope selection</span>
          {editingCoupon.scope_type === "CATEGORY" ? (
            <select value={editingCoupon.scope_value ?? ""} onChange={(event) => setEditingCoupon({ ...editingCoupon, scope_value: event.target.value })}>
              <option value="">Choose category</option>
              {[...new Set(catalog.map((product) => categorySlug(product.category)))].map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          ) : editingCoupon.scope_type === "PRODUCT" ? (
            <select value={editingCoupon.scope_value ?? ""} onChange={(event) => setEditingCoupon({ ...editingCoupon, scope_value: event.target.value })}>
              <option value="">Choose product</option>
              {catalog.map((product) => <option key={product.apiId ?? product.id} value={product.apiId ?? product.id}>{product.name}</option>)}
            </select>
          ) : <input value="Automatically selected" disabled />}
        </label>
        <label className="form-field">
          <span>Fulfilment</span>
          <select value={editingCoupon.fulfillment_scope} onChange={(event) => setEditingCoupon({ ...editingCoupon, fulfillment_scope: event.target.value as AdminCoupon["fulfillment_scope"] })}>
            <option value="ALL">All methods</option>
            <option value="PICKUP">Pickup</option>
            <option value="DELIVERY">Delivery</option>
            <option value="SHIPPING">Shipping</option>
          </select>
        </label>
      </div>
      <div className="form-split four">
        <label className="form-field"><span>Minimum spend (KSh)</span><input type="number" min="0" value={editingCoupon.min_spend} onChange={(event) => setEditingCoupon({ ...editingCoupon, min_spend: Number(event.target.value) })} /></label>
        <label className="form-field"><span>Issue limit</span><input type="number" min="1" placeholder="Unlimited" value={editingCoupon.issuance_limit ?? ""} onChange={(event) => setEditingCoupon({ ...editingCoupon, issuance_limit: event.target.value ? Number(event.target.value) : null })} /></label>
        <label className="form-field"><span>Use limit</span><input type="number" min="1" placeholder="Unlimited" value={editingCoupon.usage_limit ?? ""} onChange={(event) => setEditingCoupon({ ...editingCoupon, usage_limit: event.target.value ? Number(event.target.value) : null })} /></label>
        <label className="form-field"><span>Per customer</span><input type="number" min="1" max="100" value={editingCoupon.per_user_limit} onChange={(event) => setEditingCoupon({ ...editingCoupon, per_user_limit: Number(event.target.value) })} /></label>
      </div>
      <div className="form-split">
        <label className="form-field"><span>Starts (Nairobi time)</span><input type="datetime-local" value={inputDateTime(editingCoupon.starts_at)} onChange={(event) => setEditingCoupon({ ...editingCoupon, starts_at: nairobiDateTimeIso(event.target.value) })} /></label>
        <label className="form-field"><span>Ends (Nairobi time)</span><input type="datetime-local" value={inputDateTime(editingCoupon.ends_at)} onChange={(event) => setEditingCoupon({ ...editingCoupon, ends_at: nairobiDateTimeIso(event.target.value) })} /></label>
      </div>
    </fieldset>
    <div className="coupon-customer-preview">
      <span>Customer preview</span>
      <strong>{editingCoupon.discount_type === "PERCENT" ? `${editingCoupon.discount_value}%` : editingCoupon.discount_type === "FIXED" ? money(editingCoupon.discount_value) : "FREE"}</strong>
      <div><b>{editingCoupon.name_en || "Coupon name"}</b><small>{editingCoupon.code || "CODE"} · Min. {money(editingCoupon.min_spend)}</small></div>
    </div>
    {couponError && <div className="form-error" role="alert">{couponError}</div>}
    {editingCoupon.redeemed_count === 0 && (
      <button className="primary full" disabled={couponBusy} onClick={() => void saveCoupon()}>{couponBusy ? "Saving…" : editingCoupon.id ? "Save coupon draft →" : "Create draft →"}</button>
    )}
    <small className="admin-sync-note">After saving, publish from the coupon list. Dates are displayed in Africa/Nairobi.</small>
  </section>
</div>
  );
}
