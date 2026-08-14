import Link from "next/link";
import type { MouseEvent } from "react";
import type { AdminOverview, AdminSession, AdminTab } from "../core/types";
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

type LaunchCard = {
  tab: AdminTab;
  eyebrow: string;
  title: string;
  titleZh: string;
  description: string;
  descriptionZh: string;
  icon: Parameters<typeof AdminIcon>[0]["name"];
  adminOnly?: boolean;
};

const launchCards: LaunchCard[] = [
  {
    tab: "redeem",
    eyebrow: "PICKUP DESK",
    title: "Redeem",
    titleZh: "核销取餐",
    description: "Scan a pickup QR and hand over the right order.",
    descriptionZh: "扫描取餐二维码，快速完成交付。",
    icon: "redeem",
  },
  {
    tab: "orders",
    eyebrow: "STORE OPERATIONS",
    title: "Orders",
    titleZh: "订单处理",
    description: "Find live orders and move them through fulfilment.",
    descriptionZh: "查看实时订单并更新制作与交付状态。",
    icon: "orders",
  },
  {
    tab: "customers",
    eyebrow: "CUSTOMER CARE",
    title: "Customers",
    titleZh: "顾客查询",
    description: "Look up customer details and order history.",
    descriptionZh: "查询顾客资料与历史订单。",
    icon: "customers",
  },
  {
    tab: "admin",
    eyebrow: "MANAGEMENT",
    title: "Admin",
    titleZh: "后台管理",
    description: "Manage products, coupons, stores and staff access.",
    descriptionZh: "管理商品、优惠券、门店与员工权限。",
    icon: "admin",
    adminOnly: true,
  },
];

export function AdminHomeView({
  session,
  overview,
  customerCount,
  activeOrderCount,
  setTab,
}: {
  session: AdminSession;
  overview: AdminOverview | null;
  customerCount: number;
  activeOrderCount: number;
  setTab: (tab: AdminTab) => void;
}) {
  const cards = launchCards.filter(
    (card) => !card.adminOnly || session.role === "ADMIN",
  );

  const cardMeta = (tab: AdminTab) => {
    if (tab === "orders") return `${activeOrderCount} active / 处理中`;
    if (tab === "customers") {
      return `${overview?.metrics.customer_count ?? customerCount} customers / 顾客`;
    }
    if (tab === "redeem") {
      return `${session.role === "ADMIN" ? "All stores" : `${session.stores.length} assigned`} / 门店范围`;
    }
    return "Admin only / 仅管理员";
  };

  return (
    <section className="admin-home" aria-label="Staff tasks / 员工操作">
      <div className="admin-launch-grid">
        {cards.map((card) => (
          <Link
            key={card.tab}
            href={adminTabPath(card.tab)}
            className={`admin-launch-card admin-launch-${card.tab}`}
            onClick={(event) => navigateInPlace(event, () => setTab(card.tab))}
            aria-label={`${card.title}: ${card.description}`}
          >
            <span className="admin-launch-icon" aria-hidden="true">
              <AdminIcon name={card.icon} />
            </span>
            <span className="admin-launch-copy">
              <small>{card.eyebrow}</small>
              <strong>{card.title}</strong>
              <b>{card.titleZh}</b>
              <span>{card.description}</span>
              <span lang="zh">{card.descriptionZh}</span>
            </span>
            <span className="admin-launch-meta">
              {cardMeta(card.tab)} <i aria-hidden="true">→</i>
            </span>
          </Link>
        ))}
      </div>

      {session.role === "OPERATOR" && (
        <p className="admin-home-note">
          Customer records are view-only for store staff. Product, coupon and staff access tools require an Admin account.
          <span lang="zh">门店员工仅可查看顾客资料；商品、优惠券和权限管理仅限管理员。</span>
        </p>
      )}
    </section>
  );
}
