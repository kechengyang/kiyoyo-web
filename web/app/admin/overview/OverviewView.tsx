import { money } from "../../data";
import type { Order, Product } from "../../types";
import type { AdminOverview, AdminStore, AdminTab } from "../core/types";
import { Metric, OrderTable, PanelHead } from "../shared/primitives";

export function OverviewView({
  overview,
  recentOrders,
  setTab,
  catalog,
  adminStores,
  changeStatus,
  canManageOrders,
}: {
  overview: AdminOverview | null;
  recentOrders: Order[];
  setTab: (tab: AdminTab) => void;
  catalog: Product[];
  adminStores: AdminStore[];
  changeStatus: (id: string, status: Order["status"]) => void;
  canManageOrders: boolean;
}) {
  if (!overview) {
    return <section className="admin-panel"><div className="admin-empty-state"><strong>Loading scoped overview…</strong><span>Statistics are calculated by the server for your authorised stores.</span></div></section>;
  }
  const metrics = overview.metrics;
  const maximum = Math.max(1, ...overview.store_pulse.map((store) => store.order_count));
  return (
    <>
      <div className="overview-scope-note" role="status">
        <strong>{overview.scope.mode === "GLOBAL" ? "All Nairobi stores" : `Authorised stores · ${overview.scope.stores.length}`}</strong>
        <span>{overview.scope.stores.map((store) => store.area).join(" · ")}</span>
      </div>
      <section className="metric-grid">
        <Metric label="Recent orders" value={String(metrics.order_count)} note={`${metrics.active_count} active now`} trend="LIVE" />
        <Metric label="Gross sales" value={money(metrics.gross_sales)} note="Scoped item sales" trend="TEST" />
        <Metric label="Ready for pickup" value={String(metrics.ready_count)} note="Needs attention" trend="LIVE" />
        <Metric label="Members" value={String(metrics.customer_count)} note="Unique scoped customers" trend="LIVE" />
      </section>
      <div className="admin-two">
        <section className="admin-panel">
          <PanelHead title="Live orders" action="View assigned orders" onAction={() => setTab("orders")} />
          <OrderTable orders={recentOrders} catalog={catalog} stores={adminStores} onStatus={changeStatus} readOnly={!canManageOrders} />
        </section>
        <section className="admin-panel store-pulse">
          <PanelHead title="Store pulse" />
          <div className="pulse-chart">
            {overview.store_pulse.map((store) => (
              <div key={store.id}><span>{store.area}</span><i><b style={{ height: `${(store.order_count / maximum) * 100}%` }} /></i><strong>{store.order_count}</strong></div>
            ))}
          </div>
          <small>Authorised scope · live Cloud SQL data</small>
        </section>
      </div>
      <section className="admin-panel quick">
        <PanelHead title="Quick actions" />
        <div>
          <button onClick={() => setTab("products")}><i>◇</i><strong>View products</strong><span>Catalog and availability</span></button>
          <button onClick={() => setTab("redeem")}><i>⌗</i><strong>Redeem pickup</strong><span>Verify one-time QR</span></button>
          <button onClick={() => setTab("orders")}><i>▤</i><strong>Manage orders</strong><span>Update preparation status</span></button>
        </div>
      </section>
    </>
  );
}
