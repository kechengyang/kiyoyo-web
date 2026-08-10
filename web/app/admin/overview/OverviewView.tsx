import { money } from "../../data";
import type { Order, Product } from "../../types";
import type { AdminCustomer, AdminStore, AdminTab } from "../core/types";
import { Metric, OrderTable, PanelHead } from "../shared/primitives";

export function OverviewView({ orders, active, revenue, customers, setTab, catalog, adminStores, changeStatus }: {
  orders: Order[];
  active: Order[];
  revenue: number;
  customers: AdminCustomer[];
  setTab: (tab: AdminTab) => void;
  catalog: Product[];
  adminStores: AdminStore[];
  changeStatus: (id: string, status: Order["status"]) => void;
}) {
  return (
<>
  <section className="metric-grid">
    <Metric
      label="Recent orders"
      value={String(orders.length)}
      note={`${active.length} active now`}
      trend="LIVE"
    />
    <Metric
      label="Gross sales"
      value={money(revenue)}
      note="Mock payment value"
      trend="TEST"
    />
    <Metric
      label="Ready for pickup"
      value={String(
        orders.filter((o) => o.status === "Ready").length,
      )}
      note="Needs attention"
      trend="LIVE"
    />
    <Metric
      label="Members"
      value={String(customers.length)}
      note="Loaded from Cloud SQL"
      trend="LIVE"
    />
  </section>
  <div className="admin-two">
    <section className="admin-panel">
      <PanelHead
        title="Live orders"
        action="View all"
        onAction={() => setTab("orders")}
      />
      <OrderTable
        orders={orders.slice(0, 5)}
        catalog={catalog}
        stores={adminStores}
        onStatus={changeStatus}
      />
    </section>
    <section className="admin-panel store-pulse">
      <PanelHead title="Store pulse" />
      <div className="pulse-chart">
        {adminStores.slice(0, 5).map((store) => {
          const count = orders.filter(
            (order) => order.storeId === store.code,
          ).length;
          const maximum = Math.max(
            1,
            ...adminStores.map(
              (candidate) =>
                orders.filter(
                  (order) => order.storeId === candidate.code,
                ).length,
            ),
          );
          return (
            <div key={store.id}>
              <span>{store.area}</span>
              <i>
                <b style={{ height: `${(count / maximum) * 100}%` }} />
              </i>
              <strong>{count}</strong>
            </div>
          );
        })}
      </div>
      <small>Recent orders · live Cloud SQL data</small>
    </section>
  </div>
  <section className="admin-panel quick">
    <PanelHead title="Quick actions" />
    <div>
      <button onClick={() => setTab("products")}>
        <i>◇</i>
        <strong>Manage products</strong>
        <span>Pricing, offers & images</span>
      </button>
      <button onClick={() => setTab("redeem")}>
        <i>⌗</i>
        <strong>Redeem pickup</strong>
        <span>Verify one-time QR</span>
      </button>
      <button onClick={() => setTab("orders")}>
        <i>▤</i>
        <strong>Manage orders</strong>
        <span>Update preparation status</span>
      </button>
    </div>
  </section>
</>
  );
}
