import type { Dispatch, SetStateAction } from "react";
import type { Order, Product } from "../../types";
import type { AdminStore } from "../core/types";
import { OrderTable, PanelHead } from "../shared/primitives";

export function OrdersView({
  storeFilter,
  setStoreFilter,
  adminStores,
  shown,
  catalog,
  changeStatus,
  refreshing,
  lastUpdatedAt,
  liveUpdatesConnected,
  onRefresh,
}: {
  storeFilter: string;
  setStoreFilter: Dispatch<SetStateAction<string>>;
  adminStores: AdminStore[];
  shown: Order[];
  catalog: Product[];
  changeStatus: (id: string, status: Order["status"]) => void;
  refreshing: boolean;
  lastUpdatedAt: number | null;
  liveUpdatesConnected: boolean;
  onRefresh: () => void;
}) {
  const lastUpdated = lastUpdatedAt
    ? new Date(lastUpdatedAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "Not synced yet / 尚未同步";
  return (
<section className="admin-panel wide">
  <div className="orders-tools">
    <div>
      <PanelHead title="All orders / 全部订单" />
      <p className="orders-refresh-meta" aria-live="polite">
        <span className={liveUpdatesConnected ? "connected" : "reconnecting"}>
          {liveUpdatesConnected
            ? "Live updates connected / 实时更新已连接"
            : "Live updates reconnecting / 实时更新重连中"}
        </span>
        <span>Last updated / 最后更新：{lastUpdated}</span>
      </p>
    </div>
    <div className="orders-tools-actions">
      <select
        aria-label="Filter orders by store / 按门店筛选订单"
        value={storeFilter}
        onChange={(e) => setStoreFilter(e.target.value)}
      >
        <option value="all">All Nairobi stores / 内罗毕全部门店</option>
        {adminStores.map((store) => (
          <option key={store.id} value={store.code}>
            {store.area}
          </option>
        ))}
      </select>
      <button
        className="orders-refresh-button"
        type="button"
        onClick={onRefresh}
        disabled={refreshing}
        aria-busy={refreshing}
      >
        {refreshing ? "Refreshing… / 刷新中…" : "Refresh / 刷新"}
      </button>
    </div>
  </div>
  <OrderTable
    orders={shown}
    catalog={catalog}
    stores={adminStores}
    onStatus={changeStatus}
  />
</section>
  );
}
