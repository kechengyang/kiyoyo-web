/* eslint-disable @next/next/no-img-element -- Order history retains stored product images. */

import type { Dispatch, SetStateAction } from "react";
import { salePrice } from "../../catalog";
import { money } from "../../data";
import type { Address, Lang, Order, Product } from "../../types";
import type { CustomerCopy } from "./copy";
import { DialogBackdrop } from "./DialogBackdrop";
import { PickupQR } from "./primitives";

export function OrderDetailDialog({
  selectedOrder, setSelectedOrder, t, lang, selectedOrderStore, selectedOrderAddress,
  pickupQrError, pickupQrLoading, restorePickupQr, setEditingOrderId, catalog,
}: {
  selectedOrder: Order;
  setSelectedOrder: Dispatch<SetStateAction<Order | null>>;
  t: CustomerCopy;
  lang: Lang;
  selectedOrderStore: { name: string; address: string } | undefined;
  selectedOrderAddress: Address | undefined;
  pickupQrError: string;
  pickupQrLoading: boolean;
  restorePickupQr: () => void;
  setEditingOrderId: Dispatch<SetStateAction<string | null>>;
  catalog: Product[];
}) {
  return (
<DialogBackdrop
  className="order-detail-backdrop"
  closeOnBackdrop
  labelledBy="order-detail-title"
  onClose={() => setSelectedOrder(null)}
>
  <section
    className="order-detail-modal"
  >
    <button
      className="modal-close"
      onClick={() => setSelectedOrder(null)}
      aria-label={t.close}
    >
      ×
    </button>
    <div className="order-detail-heading">
      <div>
        <span className="sticker">{selectedOrder.status}</span>
        <h2 id="order-detail-title">{t.orderDetails}</h2>
        <strong>{selectedOrder.id}</strong>
      </div>
      <span>{selectedOrder.channel}</span>
    </div>
    <p className="order-detail-date">
      {new Date(selectedOrder.createdAt).toLocaleString(
        lang === "zh" ? "zh-CN" : "en-KE",
        {
          dateStyle: "full",
          timeStyle: "short",
          timeZone: "Africa/Nairobi",
        },
      )}
    </p>

    {selectedOrder.channel === "Pickup" ? (
      <section className="order-pickup-card">
        <div>
          <span>{t.pickupAt}</span>
          <strong>
            {selectedOrderStore?.name ??
              (lang === "zh" ? "KIYOYO 门店" : "KIYOYO store")}
          </strong>
          <p>{selectedOrderStore?.address}</p>
        </div>
        {selectedOrder.pickupCode !== "NO-PICKUP" &&
        !["Completed", "Cancelled"].includes(selectedOrder.status) ? (
          <div className="order-pickup-code">
            <PickupQR code={selectedOrder.pickupCode} />
            <code>{selectedOrder.pickupCode}</code>
            <small>{t.qrHelp}</small>
          </div>
        ) : selectedOrder.pickupCanReissue &&
          !["Completed", "Cancelled"].includes(
            selectedOrder.status,
          ) ? (
          <div className="order-reissue-code">
            <b>▦</b>
            <strong>{t.restorePickupCode}</strong>
            <p>{t.restorePickupHelp}</p>
            {pickupQrError && <small>{pickupQrError}</small>}
            <button
              className="primary"
              disabled={pickupQrLoading}
              onClick={restorePickupQr}
            >
              {pickupQrLoading
                ? t.restoringCode
                : `${t.restorePickupCode} →`}
            </button>
          </div>
        ) : (
          <div className="order-closed-code">
            <b>✓</b>
            <span>
              {selectedOrder.status === "Completed"
                ? lang === "zh"
                  ? "订单已核销"
                  : "Pickup completed"
                : lang === "zh"
                  ? "二维码当前不可用"
                  : "Pickup code unavailable"}
            </span>
          </div>
        )}
      </section>
    ) : (
      <section className="order-delivery-card">
        <span>{t.deliverTo}</span>
        <strong>
          {selectedOrderAddress?.label ??
            (lang === "zh" ? "配送地址" : "Delivery address")}
        </strong>
        {selectedOrderAddress ? (
          <p>
            {selectedOrderAddress.recipient} ·{" "}
            {selectedOrderAddress.phone}
            <br />
            {selectedOrderAddress.line1}, {selectedOrderAddress.area}
          </p>
        ) : (
          <p>{lang === "zh" ? "地址信息不可用" : "Address unavailable"}</p>
        )}
        {selectedOrder.status === "Placed" && (
          <button
            onClick={() => {
              setSelectedOrder(null);
              setEditingOrderId(selectedOrder.id);
            }}
          >
            {t.changeAddress} →
          </button>
        )}
      </section>
    )}

    <section className="order-detail-items">
      <h3>{t.orderedItems}</h3>
      {selectedOrder.items.map((item) => {
        const product = catalog.find(
          (candidate) => candidate.id === item.productId,
        );
        const itemName =
          lang === "zh"
            ? (item.productNameZh ?? product?.nameZh ?? item.productId)
            : (item.productName ?? product?.name ?? item.productId);
        const options = [
          item.size,
          item.sugar,
          item.ice,
          ...(item.toppings ?? []),
        ].filter(Boolean);
        const lineTotal =
          item.lineTotal ??
          (item.unitPrice ?? (product ? salePrice(product) : 0)) *
            item.quantity;
        return (
          <article key={item.key}>
            {(item.productImage ?? product?.image) && (
              <img
                src={item.productImage ?? product?.image}
                alt=""
              />
            )}
            <div>
              <strong>{itemName}</strong>
              {options.length > 0 && <span>{options.join(" · ")}</span>}
              <small>× {item.quantity}</small>
            </div>
            <b>{money(lineTotal)}</b>
          </article>
        );
      })}
    </section>

    <div className="order-detail-total">
      <span>
        {selectedOrder.subtotal != null && (
          <small>{t.subtotal} · {money(selectedOrder.subtotal)}</small>
        )}
        {(selectedOrder.discount ?? 0) > 0 && (
          <small>
            {lang === "zh" ? "优惠券" : "Coupon"}{" "}
            {selectedOrder.couponCode ? `· ${selectedOrder.couponCode} ` : ""}
            −{money(selectedOrder.discount ?? 0)}
          </small>
        )}
        {t.orderTotal}
      </span>
      <strong>{money(selectedOrder.total)}</strong>
    </div>
    <button
      className="primary full order-detail-close"
      onClick={() => setSelectedOrder(null)}
    >
      {t.close}
    </button>
  </section>
</DialogBackdrop>
  );
}
