import Link from "next/link";
import { signOutMember } from "../../platform";
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
}: {
  tab: AdminTab;
  cloudStatus: string;
  activeCount: number;
  scopeLabel: string;
}) {
  return (
    <header className="admin-top">
      <div>
        <small>KIYOYO / {scopeLabel}</small>
        <h1>{tab}</h1>
      </div>
      <div>
        <span className="live-dot" /> {cloudStatus}{" "}
        <button onClick={() => void signOutMember()}>
          Sign out <b>{activeCount}</b>
        </button>
      </div>
    </header>
  );
}
