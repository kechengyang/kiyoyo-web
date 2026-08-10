/* eslint-disable @next/next/no-img-element -- Tiny admin thumbnails do not need image optimization. */

import { money } from "../../data";
import type { Order, Product } from "../../types";
import type { AdminStore } from "../core/types";

export function Metric({
  label,
  value,
  note,
  trend,
}: {
  label: string;
  value: string;
  note: string;
  trend: string;
}) {
  return (
    <article className="metric">
      <div>
        <span>{label}</span>
        <b>{trend}</b>
      </div>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}
export function PanelHead({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="panel-head">
      <h2>{title}</h2>
      {action && <button onClick={onAction}>{action} →</button>}
    </div>
  );
}
export function OrderTable({
  orders,
  catalog,
  stores,
  onStatus,
}: {
  orders: Order[];
  catalog: Product[];
  stores: AdminStore[];
  onStatus: (id: string, status: Order["status"]) => void;
}) {
  return (
    <div className="order-table">
      <div className="table-head">
        <span>Order</span>
        <span>Store / channel</span>
        <span>Items</span>
        <span>Total</span>
        <span>Status</span>
      </div>
      {orders.map((o) => (
        <div className="order-row" key={o.id}>
          <span>
            <strong>{o.id}</strong>
            <small>
              {new Date(o.createdAt).toLocaleTimeString("en-KE", {
                hour: "2-digit",
                minute: "2-digit",
                timeZone: "Africa/Nairobi",
              })}
            </small>
          </span>
          <span>
            <b>
              {stores.find((store) => store.code === o.storeId)?.area ||
                o.storeId}
            </b>
            <small>{o.channel}</small>
          </span>
          <span className="item-stack">
            {o.items.slice(0, 3).map((i) => (
              <img
                key={i.key}
                src={catalog.find((p) => p.id === i.productId)?.image}
                alt=""
              />
            ))}
          </span>
          <strong>{money(o.total)}</strong>
          <select
            className={`status-select s-${o.status.toLowerCase()}`}
            value={o.status}
            onChange={(e) => onStatus(o.id, e.target.value as Order["status"])}
          >
            <option>Placed</option>
            <option>Confirmed</option>
            <option>Preparing</option>
            <option>Ready</option>
            <option>Completed</option>
            <option>Cancelled</option>
          </select>
        </div>
      ))}
    </div>
  );
}
