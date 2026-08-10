import type { Dispatch, SetStateAction } from "react";
import { money } from "../../data";
import { newCouponDraft } from "../core/foundation";
import type { AdminCoupon } from "../core/types";

export type CouponAction = "publish" | "stop-distribution" | "disable" | "archive";

export function CouponsView({ coupons, setCouponError, setEditingCoupon, couponError, couponBusy, runCouponAction }: {
  coupons: AdminCoupon[];
  setCouponError: Dispatch<SetStateAction<string>>;
  setEditingCoupon: Dispatch<SetStateAction<AdminCoupon | null>>;
  couponError: string;
  couponBusy: boolean;
  runCouponAction: (coupon: AdminCoupon, action: CouponAction) => void;
}) {
  return (
<section className="admin-panel wide coupon-management">
  <div className="product-admin-head">
    <div>
      <span className="red-label">PROMOTIONS</span>
      <h2>Coupon management</h2>
      <p>Create rules, schedule publishing, stop distribution and review redemptions.</p>
    </div>
    <div className="catalog-stats">
      <span><b>{coupons.filter((coupon) => coupon.effective_status === "ACTIVE").length}</b> active</span>
      <span><b>{coupons.reduce((sum, coupon) => sum + coupon.redeemed_count, 0)}</b> used</span>
      <button onClick={() => {
        setCouponError("");
        setEditingCoupon(newCouponDraft());
      }}>+ Create coupon</button>
    </div>
  </div>
  {couponError && <div className="form-error" role="alert">{couponError}</div>}
  <div className="admin-coupon-list">
    <div className="coupon-list-head">
      <span>Coupon</span>
      <span>Offer</span>
      <span>Window</span>
      <span>Status</span>
      <span>Issued / used</span>
      <span>Actions</span>
    </div>
    {coupons.length ? coupons.map((coupon) => (
      <article key={coupon.id}>
        <span className="admin-coupon-name">
          <strong>{coupon.name_en}</strong>
          <small>{coupon.code} · {coupon.issuance_mode === "ASSIGNED" ? "Member wallet" : "Public code"}</small>
        </span>
        <span>
          <strong>
            {coupon.discount_type === "PERCENT"
              ? `${coupon.discount_value}% off`
              : coupon.discount_type === "FIXED"
                ? `${money(coupon.discount_value)} off`
                : "Free size upgrade"}
          </strong>
          <small>{coupon.min_spend ? `Min. ${money(coupon.min_spend)}` : "No minimum"}</small>
        </span>
        <span>
          <strong>{new Date(coupon.starts_at).toLocaleDateString("en-KE")}</strong>
          <small>to {new Date(coupon.ends_at).toLocaleDateString("en-KE")}</small>
        </span>
        <span>
          <em className="coupon-status" data-status={coupon.effective_status.toLowerCase()}>
            {coupon.effective_status}
          </em>
          <small>{coupon.effective_status === "ENDED" ? "Window ended" : coupon.issuance_enabled ? "Distribution on" : "Distribution off"}</small>
        </span>
        <span>
          <strong>{coupon.issued_count} / {coupon.redeemed_count}</strong>
          <small>{money(coupon.discount_total)} discounted</small>
        </span>
        <span className="coupon-row-actions">
          <button onClick={() => {
            setCouponError("");
            setEditingCoupon({ ...coupon });
          }}>{coupon.redeemed_count ? "View rules" : "Edit"}</button>
          {!coupon.redemption_enabled && coupon.effective_status !== "ARCHIVED" && coupon.effective_status !== "ENDED" && (
            <button disabled={couponBusy} onClick={() => void runCouponAction(coupon, "publish")}>Publish</button>
          )}
          {coupon.redemption_enabled && !coupon.issuance_enabled && (
            <button disabled={couponBusy} onClick={() => void runCouponAction(coupon, "publish")}>Resume</button>
          )}
          {coupon.issuance_enabled && ["ACTIVE", "SCHEDULED"].includes(coupon.effective_status) && (
            <button disabled={couponBusy} onClick={() => void runCouponAction(coupon, "stop-distribution")}>Stop issuing</button>
          )}
          {coupon.redemption_enabled && ["ACTIVE", "SCHEDULED"].includes(coupon.effective_status) && (
            <button className="danger-text" disabled={couponBusy} onClick={() => void runCouponAction(coupon, "disable")}>Disable use</button>
          )}
          {coupon.effective_status !== "ARCHIVED" && (!coupon.redemption_enabled || coupon.effective_status === "ENDED") && (
            <button disabled={couponBusy} onClick={() => void runCouponAction(coupon, "archive")}>Archive</button>
          )}
        </span>
      </article>
    )) : (
      <div className="admin-empty-state">
        <strong>No coupons yet</strong>
        <span>Create a draft, review its customer preview, then publish it.</span>
      </div>
    )}
  </div>
</section>
  );
}
