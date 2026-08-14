import type { Dispatch, SetStateAction } from "react";
import type { AdminStore } from "../core/types";
import { PanelHead } from "../shared/primitives";

export function StoresView({
  adminStores,
  setEditingStore,
}: {
  adminStores: AdminStore[];
  setEditingStore: Dispatch<SetStateAction<AdminStore | null>>;
}) {
  return (
    <section className="admin-panel wide">
      <PanelHead title="Nairobi stores" />
      <div className="admin-store-grid">
        {adminStores.map((store, index) => (
          <article key={store.id}>
            <span>0{index + 1}</span>
            <div>
              <h3>{store.name}</h3>
              <p>{store.address}</p>
              <small>{store.phone || "No phone"}</small>
            </div>
            <span className="store-card-actions">
              <em
                className={store.location_verified ? "verified" : "pending"}
              >
                {store.location_verified ? "Verified" : "Confirm details"}
              </em>
              <em
                className={store.pospal_account ? "verified" : "pending"}
                title={store.pospal_account ?? undefined}
              >
                {store.pospal_account ? "POSPAL linked" : "POSPAL unlinked"}
              </em>
              <button onClick={() => setEditingStore({ ...store })}>
                Edit →
              </button>
            </span>
          </article>
        ))}
      </div>
      <div className="store-warning">
        ⓘ Public KIYOYO sources currently verify four branches. Eastleigh and
        Store 06 require exact operations data before production launch.
      </div>
    </section>
  );
}
