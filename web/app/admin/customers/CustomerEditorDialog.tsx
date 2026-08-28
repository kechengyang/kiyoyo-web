import { useState, type Dispatch, type SetStateAction } from "react";
import { money } from "../../data";
import type { AdminCoupon, AdminCustomer, CustomerDetail } from "../core/types";

export function CustomerEditorDialog({
  selectedCustomer, setSelectedCustomer, issueCouponId, setIssueCouponId,
  coupons, couponBusy, issueCoupon, couponError, revokeUserCoupon, saveCustomer,
  canWrite, canSetPassword, setCustomerPassword,
  canAdjustPoints, adjustCustomerPoints,
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
  canWrite: boolean;
  canSetPassword: boolean;
  setCustomerPassword: (password: string, passwordConfirm: string, reason: string) => void;
  canAdjustPoints: boolean;
  adjustCustomerPoints: (type: "CREDIT" | "DEBIT", points: number, reason: string, externalReference: string) => Promise<void>;
}) {
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [passwordReason, setPasswordReason] = useState("");
  const [points, setPoints] = useState("");
  const [adjustmentType, setAdjustmentType] = useState<"CREDIT" | "DEBIT">("CREDIT");
  const [pointsReason, setPointsReason] = useState("");
  const [pointsReference, setPointsReference] = useState("");
  const [pointsSuccess, setPointsSuccess] = useState("");
  const parsedPoints = Number(points);
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
          disabled={!canWrite}
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
          disabled={!canWrite}
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
        <small>Points / 积分</small>
        <strong>{selectedCustomer.points_balance.toLocaleString()}</strong>
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
    <h3>Points wallet / 积分钱包</h3>
    {canAdjustPoints && (
      <section className="customer-points-credit">
        <p>Credit verified purchases such as a VIP card, or debit points to correct an error. Every change is audited. / 为 VIP 卡等已确认付款充值，或扣减积分纠错；所有操作都会记录。</p>
        <div className="form-split">
          <label className="form-field">
            <span>Adjustment / 操作</span>
            <select value={adjustmentType} onChange={(event) => { setAdjustmentType(event.target.value as "CREDIT" | "DEBIT"); setPointsSuccess(""); }}>
              <option value="CREDIT">Credit / 充值</option>
              <option value="DEBIT">Debit correction / 扣减纠错</option>
            </select>
          </label>
          <label className="form-field">
            <span>Points / 积分</span>
            <input type="number" min="1" max="1000000" step="1" value={points} onChange={(event) => { setPoints(event.target.value); setPointsSuccess(""); }} />
          </label>
        </div>
        <div className="form-split">
          <label className="form-field">
            <span>Reference (optional) / 参考号</span>
            <input value={pointsReference} onChange={(event) => setPointsReference(event.target.value)} placeholder="VIP card receipt / VIP 卡收据" />
          </label>
        </div>
        <label className="form-field">
          <span>Reason / 原因</span>
          <input value={pointsReason} onChange={(event) => setPointsReason(event.target.value)} placeholder="VIP card purchase / 购买 VIP 卡" />
        </label>
        <button
          className={adjustmentType === "DEBIT" ? "danger" : undefined}
          disabled={couponBusy || !Number.isInteger(parsedPoints) || parsedPoints < 1 || parsedPoints > 1_000_000 || (adjustmentType === "DEBIT" && parsedPoints > selectedCustomer.points_balance) || pointsReason.trim().length < 3 || selectedCustomer.status !== "ACTIVE"}
          onClick={async () => {
            const verb = adjustmentType === "CREDIT" ? "Credit" : "Debit";
            if (!window.confirm(`${verb} ${parsedPoints.toLocaleString()} points ${adjustmentType === "CREDIT" ? "to" : "from"} ${selectedCustomer.nickname}?`)) return;
            try {
              await adjustCustomerPoints(adjustmentType, parsedPoints, pointsReason.trim(), pointsReference.trim());
              setPoints("");
              setPointsReason("");
              setPointsReference("");
              setPointsSuccess(`${parsedPoints.toLocaleString()} points ${adjustmentType === "CREDIT" ? "credited" : "debited"} / 积分操作成功`);
            } catch {
              setPointsSuccess("");
            }
          }}
        >
          {couponBusy ? "Saving…" : adjustmentType === "CREDIT" ? "Credit points / 充值积分" : "Debit points / 扣减积分"}
        </button>
        {pointsSuccess && <span className="form-success" role="status">{pointsSuccess}</span>}
      </section>
    )}
    <div className="record-list compact customer-points-history">
      {selectedCustomer.points_transactions.length ? selectedCustomer.points_transactions.map((transaction) => (
        <article key={transaction.id}>
          <strong>{transaction.points > 0 ? "+" : ""}{transaction.points.toLocaleString()} points</strong>
          <span>{transaction.transaction_type.replaceAll("_", " ")}</span>
          <small>{transaction.reason || "No reason"} · Balance {transaction.balance_after.toLocaleString()} · {new Date(transaction.created_at).toLocaleDateString("en-KE")}</small>
        </article>
      )) : <small>No points activity yet. / 暂无积分记录。</small>}
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
    {canWrite && <div className="customer-coupon-issuer">
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
    </div>}
    {couponError && <div className="form-error" role="alert">{couponError}</div>}
    <div className="record-list compact customer-coupon-list">
      {selectedCustomer.coupons.length ? (
        selectedCustomer.coupons.map((coupon) => (
          <article key={coupon.user_coupon_id}>
            <strong>{coupon.name_en} · {coupon.code}</strong>
            <span>{coupon.wallet_status}</span>
            <small>Expires {new Date(coupon.expires_at).toLocaleDateString("en-KE")}</small>
            {canWrite && coupon.status === "ISSUED" && coupon.wallet_status !== "EXPIRED" && (
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
    {canSetPassword && <section className="customer-password-admin">
      <button className="admin-gate-secondary" onClick={() => setShowPasswordForm(!showPasswordForm)}>{showPasswordForm ? "Cancel password change" : "Set customer password"}</button>
      {showPasswordForm && <div className="customer-password-fields">
        <div className="form-split">
          <label className="form-field"><span>New password / 新密码</span><input type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          <label className="form-field"><span>Confirm password / 确认密码</span><input type="password" autoComplete="new-password" value={passwordConfirm} onChange={(event) => setPasswordConfirm(event.target.value)} /></label>
        </div>
        <label className="form-field"><span>Reason / 原因</span><textarea value={passwordReason} onChange={(event) => setPasswordReason(event.target.value)} /></label>
        <button disabled={couponBusy || password.length < 12 || password !== passwordConfirm || passwordReason.trim().length < 3} onClick={() => {
          setCustomerPassword(password, passwordConfirm, passwordReason);
          setPassword(""); setPasswordConfirm(""); setPasswordReason(""); setShowPasswordForm(false);
        }}>Set password and revoke sessions</button>
      </div>}
    </section>}
    {canWrite && <button className="primary full" onClick={() => void saveCustomer()}>Save customer →</button>}
  </section>
</div>
  );
}
