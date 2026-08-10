import type { Dispatch, SetStateAction } from "react";
import type { Order, Product } from "../../types";
import type { AdminStore } from "../core/types";
import { OrderTable, PanelHead } from "../shared/primitives";

export function OrdersView({ storeFilter, setStoreFilter, adminStores, shown, catalog, changeStatus }: {
  storeFilter: string;
  setStoreFilter: Dispatch<SetStateAction<string>>;
  adminStores: AdminStore[];
  shown: Order[];
  catalog: Product[];
  changeStatus: (id: string, status: Order["status"]) => void;
}) {
  return (
<section className="admin-panel wide">
  <div className="orders-tools">
    <PanelHead title="All orders" />
    <select
      value={storeFilter}
      onChange={(e) => setStoreFilter(e.target.value)}
    >
      <option value="all">All Nairobi stores</option>
      {adminStores.map((store) => (
        <option key={store.id} value={store.code}>
          {store.area}
        </option>
      ))}
    </select>
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
