import { money } from "../../data";
import type { AdminCustomer } from "../core/types";
import { PanelHead } from "../shared/primitives";

export function CustomersView({ customers, openCustomer }: {
  customers: AdminCustomer[];
  openCustomer: (customer: AdminCustomer) => void;
}) {
  return (
<section className="admin-panel wide">
  <PanelHead title="Customers" />
  <div className="customer-table">
    <div className="table-head">
      <span>Customer</span>
      <span>Status</span>
      <span>Lifetime</span>
      <span>Orders</span>
      <span>Action</span>
    </div>
    {customers.map((c) => (
      <div className="customer-row" key={c.id}>
        <span>
          <i>
            {c.nickname
              .split(" ")
              .map((x) => x[0])
              .join("")}
          </i>
          <b>
            {c.nickname}
            <small>{c.email || "No email"}</small>
          </b>
        </span>
        <span>
          <em data-status={c.status.toLowerCase()}>{c.status}</em>
        </span>
        <strong>{money(c.lifetime_value)}</strong>
        <span>{c.order_count}</span>
        <button onClick={() => void openCustomer(c)}>Manage →</button>
      </div>
    ))}
  </div>
</section>
  );
}
