import Link from "next/link";
import type { Dispatch, SetStateAction } from "react";
import { money } from "../../../data";
import type {
  Address, AuthSession, CartItem, Lang, Order, Tab, UserCoupon, UserProfile,
} from "../../../types";
import type { AuthErrorCode, AuthProvider } from "../../../auth/types";
import { maskedPhoneNumber } from "../../../auth/phone";
import type { CustomerCopy } from "../core/copy";
import { couponStatusLabel } from "../core/foundation";
import { Logo, SectionHead } from "../shared/primitives";
import { ProviderManager } from "../auth/ProviderManager";

export type AccountPanel = "coupons" | "rewards" | "history";

export function AccountView({
  t, lang, session, profile, openAuth, openProfile, openAddress,
  setDefaultAddress, accountPanel, setAccountPanel, couponsLoading,
  userCoupons, selectedCouponId, setSelectedCouponId, setCouponCodeInput,
  cart, orders, openOrderDetails, setEditingOrderId, signOut,
  authBusy, authError, linkProvider, linkPassword, unlinkProvider,
  go, openPhoneVerification,
}: {
  t: CustomerCopy;
  lang: Lang;
  session: AuthSession | null;
  profile: UserProfile;
  openAuth: (mode: "signin" | "signup") => void;
  openProfile: () => void;
  openAddress: (address?: Address) => void;
  setDefaultAddress: (addressId: string) => void;
  accountPanel: AccountPanel;
  setAccountPanel: Dispatch<SetStateAction<AccountPanel>>;
  couponsLoading: boolean;
  userCoupons: UserCoupon[];
  selectedCouponId: string;
  setSelectedCouponId: Dispatch<SetStateAction<string>>;
  setCouponCodeInput: Dispatch<SetStateAction<string>>;
  cart: CartItem[];
  orders: Order[];
  openOrderDetails: (order: Order) => void;
  setEditingOrderId: Dispatch<SetStateAction<string | null>>;
  signOut: () => Promise<unknown>;
  authBusy: boolean;
  authError: AuthErrorCode | null;
  linkProvider: () => Promise<unknown>;
  linkPassword: (email: string, password: string) => Promise<unknown>;
  unlinkProvider: (provider: AuthProvider) => Promise<unknown>;
  openPhoneVerification: () => void;
  go: (tab: Tab) => void;
}) {
  return (
<section className="account-page content-section">
  {!session ? (
    <div className="account-auth">
      <div>
        <span className="sticker">KIYOYO MEMBERS</span>
        <h1>{t.authTitle}</h1>
        <p>{t.authSub}</p>
        <div>
          <button
            className="primary"
            onClick={() => openAuth("signup")}
          >
            {t.createAccount} →
          </button>
          <button
            className="text-button"
            onClick={() => openAuth("signin")}
          >
            {t.signIn}
          </button>
        </div>
      </div>
      <aside>
        <b>♡</b>
        <strong>
          {lang === "zh" ? "同步收藏" : "Save your favourites"}
        </strong>
        <span>
          {lang === "zh"
            ? "换设备也不会丢失"
            : "Keep them across devices"}
        </span>
        <b>✦</b>
        <strong>
          {lang === "zh" ? "积分与奖励" : "Points & rewards"}
        </strong>
        <span>
          {lang === "zh"
            ? "每次快乐都有回报"
            : "Get more from every order"}
        </span>
        <b>▤</b>
        <strong>
          {lang === "zh" ? "订单与地址" : "Orders & addresses"}
        </strong>
        <span>
          {lang === "zh"
            ? "快速结账、随时修改"
            : "Check out and update faster"}
        </span>
      </aside>
    </div>
  ) : (
    <>
      <div className={`member-card${session.membershipReady ? "" : " membership-pending"}`}>
        <div>
          <span>{session.membershipReady ? t.member : t.phoneRequired}</span>
          <h1>{profile.nickname || t.memberHello}</h1>
          <small>{session.membershipReady ? t.points : t.phoneRequiredHelp}</small>
          <strong>{session.membershipReady ? "2,480" : "—"}</strong>
        </div>
        <Logo />
        <i>{session.membershipReady ? "VIP" : t.membershipPending}</i>
      </div>
      {!session.phoneVerified && (
        <aside className="verification-banner phone-verification-banner" aria-live="polite">
          <div>
            <strong>{t.phoneRequired}</strong>
            <span>{t.phoneRequiredHelp}</span>
          </div>
          <div>
            <button className="primary" disabled={authBusy} onClick={openPhoneVerification}>
              {t.verifyPhone} →
            </button>
          </div>
        </aside>
      )}
      <section className="profile-panel">
        <div className="profile-head">
          <div>
            <span className="eyebrow">{t.profile}</span>
            <h2>{profile.nickname}</h2>
            <p>
              {session.email || "—"} · {session.providers.map((provider) => t.providerNames[provider]).join(" · ")}
            </p>
          </div>
          <button onClick={openProfile}>{t.editProfile} →</button>
        </div>
        <div className="profile-facts">
          <div>
            <span>{t.gender}</span>
            <strong>{profile.gender || "—"}</strong>
          </div>
          <div>
            <span>{t.age}</span>
            <strong>{profile.age || "—"}</strong>
          </div>
          <div>
            <span>
              {lang === "zh" ? "登录方式" : "Sign-in method"}
            </span>
            <strong>{session.providers.map((provider) => t.providerNames[provider]).join(", ")}</strong>
          </div>
          <div>
            <span>{t.phoneVerified}</span>
            <strong>{maskedPhoneNumber(session.phoneNumber) || t.phoneRequired}</strong>
          </div>
        </div>
        <div className="address-head">
          <h3>{t.addressBook}</h3>
          <button onClick={() => openAddress()}>
            + {t.addAddress}
          </button>
        </div>
        {profile.addresses.length ? (
          <div className="address-grid">
            {profile.addresses.map((address) => (
              <article
                key={address.id}
                className={address.isDefault ? "default" : ""}
              >
                <div>
                  <strong>{address.label}</strong>
                  {address.isDefault && <em>{t.defaultAddress}</em>}
                </div>
                <p>
                  {address.recipient} · {address.phone}
                </p>
                <span>
                  {address.line1}, {address.area}
                </span>
                <div>
                  <button onClick={() => openAddress(address)}>
                    {t.editAddress}
                  </button>
                  {!address.isDefault && (
                    <button
                      onClick={() => setDefaultAddress(address.id)}
                    >
                      {lang === "zh" ? "设为默认" : "Make default"}
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <button
            className="empty-address"
            onClick={() => openAddress()}
          >
            ⌖{" "}
            <span>
              {lang === "zh"
                ? "添加默认配送地址，让下次结账更快。"
                : "Add a default delivery address for faster checkout."}
            </span>
          </button>
        )}
      </section>
      <div className="account-tabs" role="tablist">
        <button
          className={accountPanel === "coupons" ? "active" : ""}
          onClick={() => setAccountPanel("coupons")}
          role="tab"
          aria-selected={accountPanel === "coupons"}
        >
          {t.coupons}
        </button>
        <button
          className={accountPanel === "rewards" ? "active" : ""}
          onClick={() => setAccountPanel("rewards")}
          role="tab"
          aria-selected={accountPanel === "rewards"}
        >
          {t.rewards}
        </button>
        <button
          className={accountPanel === "history" ? "active" : ""}
          onClick={() => setAccountPanel("history")}
          role="tab"
          aria-selected={accountPanel === "history"}
        >
          {t.history}
        </button>
      </div>
      {accountPanel === "coupons" && (
        <div className="coupon-grid" role="tabpanel">
          {couponsLoading ? (
            <div className="coupon-empty" aria-live="polite">
              <strong>{lang === "zh" ? "正在加载优惠券…" : "Loading coupons…"}</strong>
            </div>
          ) : userCoupons.length ? (
            userCoupons.map((coupon) => (
              <article
                key={coupon.userCouponId}
                className={
                  coupon.walletStatus === "AVAILABLE"
                    ? coupon.discountType === "FREE_SIZE_UPGRADE"
                      ? "dark"
                      : ""
                    : "coupon-muted"
                }
              >
                <b>
                  {coupon.discountType === "PERCENT"
                    ? `${coupon.discountValue}%`
                    : coupon.discountType === "FIXED"
                      ? money(coupon.discountValue)
                      : lang === "zh"
                        ? "升杯"
                        : "FREE"}
                </b>
                <div>
                  <strong>{lang === "zh" ? coupon.nameZh : coupon.nameEn}</strong>
                  <span>
                    {couponStatusLabel(coupon.walletStatus, lang)} · {lang === "zh" ? "有效期至" : "UNTIL"}{" "}
                    {new Date(coupon.expiresAt).toLocaleDateString(
                      lang === "zh" ? "zh-CN" : "en-KE",
                    )}
                  </span>
                </div>
                <button
                  disabled={coupon.walletStatus !== "AVAILABLE"}
                  onClick={() => {
                    setSelectedCouponId(coupon.userCouponId);
                    setCouponCodeInput("");
                    go(cart.length ? "cart" : "shop");
                  }}
                >
                  {selectedCouponId === coupon.userCouponId
                    ? lang === "zh"
                      ? "已选择"
                      : "SELECTED"
                    : lang === "zh"
                      ? "使用"
                      : "USE"}
                </button>
              </article>
            ))
          ) : (
            <div className="coupon-empty">
              <strong>{lang === "zh" ? "暂时没有优惠券" : "No coupons yet"}</strong>
              <span>
                {lang === "zh"
                  ? "新发放的会员券会显示在这里。"
                  : "New member coupons will appear here."}
              </span>
            </div>
          )}
        </div>
      )}
      {accountPanel === "rewards" && (
        <div className="rewards-panel" role="tabpanel">
          <span>2,480</span>
          <div>
            <strong>{t.points}</strong>
            <p>
              {lang === "zh"
                ? "再获得 520 积分即可解锁下一份会员奖励。"
                : "Earn 520 more points to unlock your next member reward."}
            </p>
            <i>
              <b style={{ width: "83%" }} />
            </i>
          </div>
        </div>
      )}
      {accountPanel === "history" && (
        <div className="account-history-panel" role="tabpanel">
          <SectionHead title={t.history} />
          {orders.length ? (
            <div className="order-history">
              {orders.map((o) => {
                const orderAddress =
                  o.addressSnapshot ??
                  profile.addresses.find(
                    (address) => address.id === o.addressId,
                  );
                return (
                  <article
                    key={o.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`${t.viewOrder} ${o.id}`}
                    onClick={() => openOrderDetails(o)}
                    onKeyDown={(event) => {
                      if (
                        event.key === "Enter" ||
                        event.key === " "
                      ) {
                        event.preventDefault();
                        openOrderDetails(o);
                      }
                    }}
                  >
                    <div>
                      <strong>{o.id}</strong>
                      <span>
                        {new Date(o.createdAt).toLocaleString(
                          lang === "zh" ? "zh-CN" : "en-KE",
                          {
                            dateStyle: "medium",
                            timeStyle: "short",
                            timeZone: "Africa/Nairobi",
                          },
                        )}
                      </span>
                      {o.channel !== "Pickup" && (
                        <small>
                          {orderAddress
                            ? `${orderAddress.label} · ${orderAddress.line1}`
                            : lang === "zh"
                              ? "未设置配送地址"
                              : "No delivery address"}
                        </small>
                      )}
                      <em>{t.viewOrder} →</em>
                    </div>
                    <div>
                      <span className="status">{o.status}</span>
                      <strong>{money(o.total)}</strong>
                      {o.channel !== "Pickup" &&
                        o.status === "Placed" && (
                          <button
                            className="order-address-edit"
                            onClick={(event) => {
                              event.stopPropagation();
                              setEditingOrderId(o.id);
                            }}
                          >
                            {t.changeAddress}
                          </button>
                        )}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="order-empty">{t.noOrders}</div>
          )}
        </div>
      )}
      <div className="account-links">
        <Link className="admin-link" href="/admin">
          ⚙ {t.admin} →
        </Link>
        <button
          onClick={() => {
            void signOut().then(() => go("home"));
          }}
        >
          {t.signOut}
        </button>
      </div>
      <ProviderManager
        session={session}
        t={t}
        busy={authBusy}
        error={authError}
        linkProvider={linkProvider}
        linkPassword={linkPassword}
        unlinkProvider={unlinkProvider}
      />
    </>
  )}
</section>
  );
}
