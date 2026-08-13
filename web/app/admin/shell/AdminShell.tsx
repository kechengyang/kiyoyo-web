import Link from "next/link";
import type { ReactNode } from "react";
import { signOutMember } from "../../auth/service";
import type { AdminSession, AdminTab } from "../core/types";

const adminTabs: AdminTab[] = [
  "home",
  "orders",
  "redeem",
  "customers",
  "admin",
];

const adminTabLabels: Partial<Record<AdminTab, string>> = {
  home: "Home",
  orders: "Orders",
  redeem: "Redeem",
  customers: "Customers",
  admin: "Admin",
};

export type AdminIconName =
  | "home"
  | "overview"
  | "orders"
  | "products"
  | "coupons"
  | "redeem"
  | "customers"
  | "stores"
  | "admin"
  | "access";

export function AdminIcon({ name }: { name: AdminIconName }) {
  const paths: Record<AdminIconName, ReactNode> = {
    home: <><path d="M3 10.5 12 3l9 7.5"/><path d="M5.5 9.5V21h13V9.5M9.5 21v-6h5v6"/></>,
    overview: <><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></>,
    orders: <><path d="M6 3h12v18H6z"/><path d="M9 8h6M9 12h6M9 16h4"/></>,
    products: <><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9"/></>,
    coupons: <><path d="M3 7a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v2a3 3 0 0 0 0 6v2a2 2 0 0 0-2 2H5a2 2 0 0 0-2-2v-2a3 3 0 0 0 0-6z"/><path d="m9 16 6-8M9 9h.01M15 15h.01"/></>,
    redeem: <><path d="M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4"/><path d="M8 8h2v2H8zM14 8h2v2h-2zM8 14h2v2H8zM14 14h2v2h-2z"/></>,
    customers: <><circle cx="12" cy="8" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/></>,
    stores: <><path d="M4 10h16l-2-6H6z"/><path d="M5 10v10h14V10M9 20v-6h6v6"/></>,
    admin: <><path d="M12 3 4.5 6v5.5c0 4.6 3.2 7.9 7.5 9.5 4.3-1.6 7.5-4.9 7.5-9.5V6z"/><path d="m9 12 2 2 4-4"/></>,
    access: <><circle cx="9" cy="8" r="4"/><path d="M2.5 21a6.5 6.5 0 0 1 13 0M17 11v6M14 14h6"/></>,
  };

  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
}

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
            className={
              tab === item ||
              (item === "admin" && ["overview", "products", "coupons", "stores", "access"].includes(tab))
                ? "active"
                : ""
            }
            aria-current={
              tab === item ||
              (item === "admin" && ["overview", "products", "coupons", "stores", "access"].includes(tab))
                ? "page"
                : undefined
            }
            onClick={() => setTab(item)}
          >
            <i><AdminIcon name={item as AdminIconName} /></i>
            <span>{adminTabLabels[item]}</span>
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
  const managementTabs: AdminTab[] = ["overview", "products", "coupons", "stores", "access"];
  const labels: Record<AdminTab, string> = {
    home: "Home",
    overview: "Business overview",
    orders: "Orders",
    products: "Products",
    coupons: "Coupons",
    redeem: "Redeem",
    customers: "Customers",
    stores: "Stores",
    admin: "Admin",
    access: "Users & access",
  };
  return (
    <header className="admin-top">
      <div>
        <small>KIYOYO / {scopeLabel}{managementTabs.includes(tab) ? " / ADMIN" : ""}</small>
        <h1>{labels[tab]}</h1>
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
