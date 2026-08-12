import Link from "next/link";
import { signOutMember } from "../../auth/service";
import type { AdminTab } from "../core/types";

const adminTabs: AdminTab[] = [
  "overview",
  "orders",
  "products",
  "coupons",
  "redeem",
  "customers",
  "stores",
];

const adminTabIcons: Record<AdminTab, string> = {
  overview: "▦",
  orders: "▤",
  products: "◇",
  coupons: "%",
  redeem: "⌗",
  customers: "☺",
  stores: "⌖",
};

export function AdminSidebar({
  tab,
  setTab,
  activeCount,
  adminEmail,
}: {
  tab: AdminTab;
  setTab: (tab: AdminTab) => void;
  activeCount: number;
  adminEmail: string;
}) {
  return (
    <aside className="admin-sidebar">
      <div className="admin-brand">
        <span className="logo">KIYOYO</span>
        <small>OPERATIONS</small>
      </div>
      <nav>
        {adminTabs.map((item) => (
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
        <i>{(adminEmail || "KI").slice(0, 2).toUpperCase()}</i>
        <span>
          <strong>{adminEmail}</strong>
          <small>Nairobi HQ</small>
        </span>
      </div>
    </aside>
  );
}

export function AdminTopbar({
  tab,
  cloudStatus,
  activeCount,
}: {
  tab: AdminTab;
  cloudStatus: string;
  activeCount: number;
}) {
  return (
    <header className="admin-top">
      <div>
        <small>KIYOYO / NAIROBI</small>
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
