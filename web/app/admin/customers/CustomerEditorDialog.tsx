import type { Dispatch, SetStateAction } from "react";
import { money } from "../../data";
import type { AdminCoupon, AdminCustomer, CustomerDetail } from "../core/types";

export function CustomerEditorDialog({
  selectedCustomer, setSelectedCustomer, issueCouponId, setIssueCouponId,
  coupons, couponBusy, issueCoupon, couponError, revokeUserCoupon, saveCustomer,
}: {
  selectedCustomer: CustomerDetail;
  setSelectedCustomer: Dispatch<SetStateAction<CustomerDetail | null>>;
  issueCouponId: string;
  setIssueCouponId: Dispatch<SetStateAction<string>>;
  coupons: AdminCoupon[];
  couponBusy: boolean;
  issueCoupon: () => void;
  couponError: string;
  revokeUserCoupon: (userCouponId: string) => void;
  saveCustomer: () => void;
}) {
  return (
<div className="modal-backdrop">
  <section className="admin-record-modal">
    <button
      className="modal-close"
      onClick={() => setSelectedCustomer(null)}
    >
      ×
    </button>
    <span className="red-label">CUSTOMER RECORD</span>
    <h2>{selectedCustomer.nickname}</h2>
    <p>{selectedCustomer.email || "No email"}</p>
    <div className="form-split">
      <label className="form-field">
        <span>Nickname</span>
        <input
          value={selectedCustomer.nickname}
          onChange={(event) =>
            setSelectedCustomer({
              ...selectedCustomer,
              nickname: event.target.value,
            })
          }
        />
      </label>
      <label className="form-field">
        <span>Account status</span>
        <select
          value={selectedCustomer.status}
          onChange={(event) =>
            setSelectedCustomer({
              ...selectedCustomer,
              status: event.target.value as AdminCustomer["status"],
            })
          }
        >
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
        </select>
      </label>
    </div>
    <div className="record-facts">
      <span>
        <small>Orders</small>
        <strong>{selectedCustomer.order_count}</strong>
      </span>
      <span>
        <small>Lifetime value</small>
        <strong>{money(selectedCustomer.lifetime_value)}</strong>
      </span>
      <span>
        <small>Joined</small>
        <strong>
          {new Date(selectedCustomer.created_at).toLocaleDateString(
            "en-KE",
          )}
        </strong>
      </span>
    </div>
    <h3>Delivery addresses</h3>
    <div className="record-list">
      {selectedCustomer.addresses.length ? (
        selectedCustomer.addresses.map((address) => (
          <article key={address.id}>
            <strong>
              {address.label} {address.is_default ? "· Default" : ""}
            </strong>
            <span>
              {address.contact_name} · {address.phone_e164}
            </span>
            <small>
              {address.line1}, {address.area}, {address.city}
            </small>
          </article>
        ))
      ) : (
        <small>No saved addresses.</small>
      )}
    </div>
    <h3>Coupons</h3>
    <div className="customer-coupon-issuer">
      <select
        aria-label="Coupon to issue"
        value={issueCouponId}
        onChange={(event) => setIssueCouponId(event.target.value)}
      >
        <option value="">Choose a published member coupon</option>
        {coupons
          .filter(
            (coupon) =>
              coupon.issuance_mode === "ASSIGNED" &&
              coupon.issuance_enabled &&
              ["ACTIVE", "SCHEDULED"].includes(coupon.effective_status),
          )
          .map((coupon) => (
            <option key={coupon.id} value={coupon.id}>
              {coupon.name_en} · {coupon.code}
            </option>
          ))}
      </select>
      <button disabled={!issueCouponId || couponBusy || selectedCustomer.status !== "ACTIVE"} onClick={() => void issueCoupon()}>
        {couponBusy ? "Issuing…" : "Issue coupon"}
      </button>
    </div>
    {couponError && <div className="form-error" role="alert">{couponError}</div>}
    <div className="record-list compact customer-coupon-list">
      {selectedCustomer.coupons.length ? (
        selectedCustomer.coupons.map((coupon) => (
          <article key={coupon.user_coupon_id}>
            <strong>{coupon.name_en} · {coupon.code}</strong>
            <span>{coupon.wallet_status}</span>
            <small>Expires {new Date(coupon.expires_at).toLocaleDateString("en-KE")}</small>
            {coupon.status === "ISSUED" && coupon.wallet_status !== "EXPIRED" && (
              <button className="danger-text" disabled={couponBusy} onClick={() => void revokeUserCoupon(coupon.user_coupon_id)}>Revoke</button>
            )}
          </article>
        ))
      ) : (
        <small>No coupons issued.</small>
      )}
    </div>
    <h3>Recent orders</h3>
    <div className="record-list compact">
      {selectedCustomer.orders.length ? (
        selectedCustomer.orders.map((order) => (
          <article key={order.order_number}>
            <strong>{order.order_number}</strong>
            <span>{order.payment_status}</span>
            <small>{money(order.total)}</small>
          </article>
        ))
      ) : (
        <small>No orders yet.</small>
      )}
    </div>
    <button className="primary full" onClick={() => void saveCustomer()}>
      Save customer →
    </button>
  </section>
</div>
  );
}
