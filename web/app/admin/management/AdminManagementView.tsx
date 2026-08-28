import Link from "next/link";
import type { MouseEvent } from "react";
import type { AdminOverview, AdminTab } from "../core/types";
import { adminTabPath } from "../core/routes";
import { AdminIcon } from "../shell/AdminShell";

const navigateInPlace = (
  event: MouseEvent<HTMLAnchorElement>,
  navigate: () => void,
) => {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  navigate();
};

const tools: Array<{
  tab: AdminTab;
  icon: Parameters<typeof AdminIcon>[0]["name"];
  title: string;
  titleZh: string;
  description: string;
}> = [
  {
    tab: "overview",
    icon: "overview",
    title: "Business overview",
    titleZh: "经营概览",
    description: "Review Nairobi-wide orders, sales and store activity.",
  },
  {
    tab: "products",
    icon: "products",
    title: "Products",
    titleZh: "商品管理",
    description: "Edit the catalogue, availability, pricing and product tags.",
  },
  {
    tab: "coupons",
    icon: "coupons",
    title: "Coupons",
    titleZh: "优惠券管理",
    description: "Create offers and control their publishing lifecycle.",
  },
  {
    tab: "loyalty",
    icon: "loyalty",
    title: "Loyalty points",
    titleZh: "积分管理",
    description: "Set the default earn rate and review how points deduct payment.",
  },
  {
    tab: "stores",
    icon: "stores",
    title: "Stores",
    titleZh: "门店管理",
    description: "Maintain store status, fulfilment and location details.",
  },
  {
    tab: "access",
    icon: "access",
    title: "Users & access",
    titleZh: "用户与权限",
    description: "Create staff accounts and manage roles and store access.",
  },
];

export function AdminManagementView({
  overview,
  setTab,
}: {
  overview: AdminOverview | null;
  setTab: (tab: AdminTab) => void;
}) {
  return (
    <section className="admin-management" aria-labelledby="admin-management-title">
      <header className="admin-management-intro">
        <small>ADMIN ONLY / 仅管理员</small>
        <h2 id="admin-management-title">Management tools</h2>
        <p>Changes here can affect every KIYOYO store and customer experience. / 此处的更改可能影响所有门店与顾客。</p>
      </header>

      <div className="admin-management-summary" aria-label="Business summary">
        <span><small>Orders</small><strong>{overview?.metrics.order_count ?? "—"}</strong></span>
        <span><small>Gross sales</small><strong>{overview ? `KSh ${overview.metrics.gross_sales.toLocaleString()}` : "—"}</strong></span>
        <span><small>Customers</small><strong>{overview?.metrics.customer_count ?? "—"}</strong></span>
      </div>

      <div className="admin-management-grid">
        {tools.map((tool) => (
          <Link
            key={tool.tab}
            href={adminTabPath(tool.tab)}
            onClick={(event) => navigateInPlace(event, () => setTab(tool.tab))}
          >
            <span aria-hidden="true"><AdminIcon name={tool.icon} /></span>
            <strong>{tool.title}</strong>
            <b>{tool.titleZh}</b>
            <small>{tool.description}</small>
            <i aria-hidden="true">→</i>
          </Link>
        ))}
      </div>
    </section>
  );
}
