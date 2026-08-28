import type { Dispatch, SetStateAction } from "react";
import { money } from "../../../data";
import type { Address, CartItem, Lang, LoyaltyWallet, Order, Product, UserCoupon, UserProfile } from "../../../types";
import type { CustomerCopy } from "../core/copy";
import { DialogBackdrop } from "../shared/DialogBackdrop";

type DetailedCartItem = CartItem & { product: Product };

export function CheckoutDialog({
  setCheckout, setCheckoutChannel, selectedStore, subtotal, t, lang, checkoutChannel,
  detailedCart, userCoupons, selectedCouponId, setSelectedCouponId, couponCodeInput,
  setCouponCodeInput, setCheckoutError, selectedCoupon, estimatedCouponDiscount,
  selectedCouponMatchesFulfillment, couponEligibleSubtotal, profile, openAddress,
  selectedAddressId, setSelectedAddressId, checkoutDeliveryFee, checkoutError,
  placingOrder, placeOrder, estimatedCheckoutTotal,
  loyalty, usePoints, setUsePoints, pointsToRedeem,
}: {
  setCheckout: Dispatch<SetStateAction<boolean>>;
  setCheckoutChannel: Dispatch<SetStateAction<Order["channel"] | null>>;
  selectedStore: { name: string };
  subtotal: number;
  t: CustomerCopy;
  lang: Lang;
  checkoutChannel: Order["channel"] | null;
  detailedCart: DetailedCartItem[];
  userCoupons: UserCoupon[];
  selectedCouponId: string;
  setSelectedCouponId: Dispatch<SetStateAction<string>>;
  couponCodeInput: string;
  setCouponCodeInput: Dispatch<SetStateAction<string>>;
  setCheckoutError: Dispatch<SetStateAction<string>>;
  selectedCoupon: UserCoupon | undefined;
  estimatedCouponDiscount: number;
  selectedCouponMatchesFulfillment: boolean;
  couponEligibleSubtotal: number;
  profile: UserProfile;
  openAddress: (address?: Address) => void;
  selectedAddressId: string;
  setSelectedAddressId: Dispatch<SetStateAction<string>>;
  checkoutDeliveryFee: number;
  checkoutError: string;
  placingOrder: boolean;
  placeOrder: (channel: Order["channel"]) => void;
  estimatedCheckoutTotal: number;
  loyalty: LoyaltyWallet;
  usePoints: boolean;
  setUsePoints: Dispatch<SetStateAction<boolean>>;
  pointsToRedeem: number;
}) {
  const maxPointsRedemption = Math.min(
    loyalty.balancePoints,
    Math.max(0, subtotal - estimatedCouponDiscount + checkoutDeliveryFee),
  );
  return (
<DialogBackdrop
  onClose={() => {
    setCheckout(false);
    setCheckoutChannel(null);
    setUsePoints(false);
  }}
>
  <div className="checkout-modal">
    <button
      className="modal-close"
      onClick={() => {
        setCheckout(false);
        setCheckoutChannel(null);
        setUsePoints(false);
      }}
    >
      ×
    </button>
    <span className="sticker">TEST CHECKOUT</span>
    <h2>{t.checkoutTitle}</h2>
    <p>
      {selectedStore.name} · {money(subtotal)}
    </p>
    <div className="fulfilment-cards">
      <button
        className={checkoutChannel === "Pickup" ? "selected" : ""}
        onClick={() => setCheckoutChannel("Pickup")}
      >
        <i>⌂</i>
        <strong>{t.pickup}</strong>
        <span>{t.pickupNote}</span>
      </button>
      <button
        className={checkoutChannel === "Delivery" ? "selected" : ""}
        onClick={() => setCheckoutChannel("Delivery")}
      >
        <i>⌁</i>
        <strong>{t.delivery}</strong>
        <span>{t.deliveryNote}</span>
      </button>
      {detailedCart.some((x) => x.product.kind === "goods") && (
        <button
          className={checkoutChannel === "Shipping" ? "selected" : ""}
          onClick={() => setCheckoutChannel("Shipping")}
        >
          <i>▧</i>
          <strong>{t.shipping}</strong>
          <span>Nairobi shipping demo</span>
        </button>
      )}
    </div>
    {checkoutChannel && (
      <section className="checkout-coupon">
        <div>
          <h3>{lang === "zh" ? "优惠券" : "Coupon"}</h3>
          {selectedCouponId && (
            <button
              type="button"
              onClick={() => setSelectedCouponId("")}
            >
              {lang === "zh" ? "移除" : "Remove"}
            </button>
          )}
        </div>
        {userCoupons.some(
          (coupon) => coupon.walletStatus === "AVAILABLE",
        ) && (
          <label>
            <span>{lang === "zh" ? "我的优惠券" : "My coupons"}</span>
            <select
              value={selectedCouponId}
              onChange={(event) => {
                setSelectedCouponId(event.target.value);
                if (event.target.value) setCouponCodeInput("");
                setCheckoutError("");
              }}
            >
              <option value="">
                {lang === "zh" ? "不使用会员券" : "No member coupon"}
              </option>
              {userCoupons
                .filter((coupon) => coupon.walletStatus === "AVAILABLE")
                .map((coupon) => (
                  <option
                    key={coupon.userCouponId}
                    value={coupon.userCouponId}
                  >
                    {lang === "zh" ? coupon.nameZh : coupon.nameEn} · {coupon.code}
                  </option>
                ))}
            </select>
          </label>
        )}
        <label>
          <span>{lang === "zh" ? "或输入优惠码" : "Or enter a promo code"}</span>
          <input
            value={couponCodeInput}
            onChange={(event) => {
              setCouponCodeInput(event.target.value.toUpperCase());
              if (event.target.value) setSelectedCouponId("");
              setCheckoutError("");
            }}
            placeholder="HAPPY20"
            autoComplete="off"
          />
        </label>
        {selectedCoupon && estimatedCouponDiscount === 0 && (
          <small className="field-error">
            {!selectedCouponMatchesFulfillment
              ? lang === "zh"
                ? "这张券不适用于当前履约方式。"
                : "This coupon does not apply to this fulfilment method."
              : couponEligibleSubtotal < selectedCoupon.minSpend
                ? lang === "zh"
                  ? `适用商品需满 ${money(selectedCoupon.minSpend)}。`
                  : `Spend ${money(selectedCoupon.minSpend)} on eligible items.`
                : lang === "zh"
                  ? "购物车中没有符合条件的商品。"
                  : "No eligible item in this cart."}
          </small>
        )}
      </section>
    )}
    {checkoutChannel && loyalty.balancePoints > 0 && (
      <section className="checkout-points">
        <label>
          <input
            type="checkbox"
            checked={usePoints}
            onChange={(event) => {
              setUsePoints(event.target.checked);
              setCheckoutError("");
            }}
          />
          <span>
            <strong>{lang === "zh" ? "使用积分抵扣" : "Use points"}</strong>
            <small>
              {lang === "zh"
                ? `余额 ${loyalty.balancePoints.toLocaleString()} 积分 · 最多抵扣 ${money(maxPointsRedemption)}`
                : `${loyalty.balancePoints.toLocaleString()} points available · Deduct up to ${money(maxPointsRedemption)}`}
            </small>
          </span>
        </label>
      </section>
    )}
    {checkoutChannel && checkoutChannel !== "Pickup" && (
      <section className="checkout-address">
        <div>
          <h3>{t.chooseAddress}</h3>
          <button onClick={() => openAddress()}>
            + {t.addAddress}
          </button>
        </div>
        {profile.addresses.length ? (
          profile.addresses.map((address) => (
            <label
              key={address.id}
              className={
                selectedAddressId === address.id ? "selected" : ""
              }
            >
              <input
                type="radio"
                name="checkout-address"
                checked={selectedAddressId === address.id}
                onChange={() => setSelectedAddressId(address.id)}
              />
              <span>
                <strong>
                  {address.label}
                  {address.isDefault ? ` · ${t.defaultAddress}` : ""}
                </strong>
                <small>
                  {address.recipient} · {address.phone}
                  <br />
                  {address.line1}, {address.area}
                </small>
              </span>
              <button
                type="button"
                onClick={() => openAddress(address)}
              >
                {t.editAddress}
              </button>
            </label>
          ))
        ) : (
          <button
            className="empty-address compact"
            onClick={() => openAddress()}
          >
            + {t.addAddress}
          </button>
        )}
      </section>
    )}
    {checkoutChannel && (
      <>
        <section className="checkout-price-summary">
          <span>{t.subtotal}<strong>{money(subtotal)}</strong></span>
          {estimatedCouponDiscount > 0 && (
            <span className="discount-row">
              {lang === "zh" ? "优惠券抵扣" : "Coupon discount"}
              <strong>−{money(estimatedCouponDiscount)}</strong>
            </span>
          )}
          {usePoints && pointsToRedeem > 0 && (
            <span className="discount-row">
              {lang === "zh" ? "积分抵扣" : "Points deduction"}
              <strong>−{money(pointsToRedeem)}</strong>
            </span>
          )}
          <span>
            {lang === "zh" ? "配送费" : "Delivery"}
            <strong>{money(checkoutDeliveryFee)}</strong>
          </span>
        </section>
        {checkoutError && (
          <p className="checkout-error" role="alert">{checkoutError}</p>
        )}
        <button
          className="primary full checkout-submit"
          disabled={
            placingOrder ||
            (checkoutChannel !== "Pickup" && !selectedAddressId) ||
            Boolean(selectedCoupon && estimatedCouponDiscount === 0)
          }
          onClick={() => placeOrder(checkoutChannel)}
        >
          {placingOrder
            ? lang === "zh"
              ? "正在提交…"
              : "Placing order…"
            : `${t.placeOrder} · ${money(estimatedCheckoutTotal)}`}
        </button>
      </>
    )}
    <small className="mock-note">ⓘ {t.mockNotice}</small>
  </div>
</DialogBackdrop>
  );
}
