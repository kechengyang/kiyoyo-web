import Link from "next/link";
import { signOutMember } from "../../auth/service";
import type { AdminSession, AdminTab } from "../core/types";

const adminTabs: AdminTab[] = [
  "overview",
  "orders",
  "products",
  "coupons",
  "redeem",
  "customers",
  "stores",
  "admin",
];

const adminTabIcons: Record<AdminTab, string> = {
  overview: "▦",
  orders: "▤",
  products: "◇",
  coupons: "%",
  redeem: "⌗",
  customers: "☺",
  stores: "⌖",
  admin: "⚿",
};

export function AdminSidebar({
  tab,
  setTab,
  activeCount,
  session,
  allowedTabs,
}: {
  tab: AdminTab;
  setTab: (tab: AdminTab) => void;
  activeCount: number;
  session: AdminSession;
  allowedTabs: AdminTab[];
}) {
  return (
    <aside className="admin-sidebar">
      <div className="admin-brand">
        <span className="logo">KIYOYO</span>
        <small>OPERATIONS</small>
      </div>
      <nav>
        {adminTabs.filter((item) => allowedTabs.includes(item)).map((item) => (
          <button
            key={item}
            className={tab === item ? "active" : ""}
            onClick={() => setTab(item)}
          >
            <i>{adminTabIcons[item]}</i>
            <span>{item}</span>
            {item === "orders" && <b>{activeCount}</b>}
          </button>
        ))}
      </nav>
      <Link href="/">← Customer store</Link>
      <div className="admin-user">
        <i>{session.username.slice(0, 2).toUpperCase()}</i>
        <span>
          <strong>{session.username}</strong>
          <small>
            {session.role === "ADMIN"
              ? "Admin · All stores"
              : `Operator · ${session.stores.length} ${session.stores.length === 1 ? "store" : "stores"}`}
          </small>
        </span>
      </div>
    </aside>
  );
}

export function AdminTopbar({
  tab,
  cloudStatus,
  activeCount,
  scopeLabel,
  orderAlertsConnected,
  soundEnabled,
  soundReady,
  toggleSound,
}: {
  tab: AdminTab;
  cloudStatus: string;
  activeCount: number;
  scopeLabel: string;
  orderAlertsConnected: boolean;
  soundEnabled: boolean;
  soundReady: boolean;
  toggleSound: () => void;
}) {
  return (
    <header className="admin-top">
      <div>
        <small>KIYOYO / {scopeLabel}</small>
        <h1>{tab}</h1>
      </div>
      <div>
        <span className="live-dot" /> {cloudStatus}{" "}
        <button
          className="order-sound-toggle"
          data-connected={orderAlertsConnected}
          data-enabled={soundEnabled}
          onClick={toggleSound}
          aria-pressed={soundEnabled}
          aria-label={soundEnabled ? "Turn off new order sound" : "Turn on new order sound"}
          title={
            !orderAlertsConnected
              ? "New order alerts are reconnecting"
              : soundEnabled && !soundReady
                ? "Click to allow new order sound"
                : soundEnabled
                  ? "New order sound on"
                  : "New order sound off"
          }
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
            {!soundEnabled && <path d="m4 4 16 16" />}
          </svg>
          <span>{soundEnabled ? "Order sound on" : "Order sound off"}</span>
        </button>
        <button onClick={() => void signOutMember()}>
          Sign out <b>{activeCount}</b>
        </button>
      </div>
    </header>
  );
}
