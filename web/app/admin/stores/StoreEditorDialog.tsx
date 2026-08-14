import type { Dispatch, SetStateAction } from "react";
import type { AdminStore } from "../core/types";

export function StoreEditorDialog({ editingStore, setEditingStore, saveStore }: {
  editingStore: AdminStore;
  setEditingStore: Dispatch<SetStateAction<AdminStore | null>>;
  saveStore: () => void;
}) {
  return (
<div className="modal-backdrop">
  <section className="admin-record-modal">
    <button className="modal-close" onClick={() => setEditingStore(null)}>
      ×
    </button>
    <span className="red-label">STORE SETTINGS</span>
    <h2>{editingStore.name}</h2>
    <div className="form-split">
      <label className="form-field">
        <span>Store name</span>
        <input
          value={editingStore.name}
          onChange={(event) =>
            setEditingStore({ ...editingStore, name: event.target.value })
          }
        />
      </label>
      <label className="form-field">
        <span>Status</span>
        <select
          value={editingStore.status}
          onChange={(event) =>
            setEditingStore({
              ...editingStore,
              status: event.target.value as AdminStore["status"],
            })
          }
        >
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="COMING_SOON">Coming soon</option>
        </select>
      </label>
    </div>
    <label className="form-field">
      <span>Address</span>
      <input
        value={editingStore.address}
        onChange={(event) =>
          setEditingStore({ ...editingStore, address: event.target.value })
        }
      />
    </label>
    <label className="form-field">
      <span>Phone</span>
      <input
        value={editingStore.phone ?? ""}
        onChange={(event) =>
          setEditingStore({ ...editingStore, phone: event.target.value })
        }
      />
    </label>
    <label className="form-field">
      <span>POSPAL account</span>
      <input
        placeholder="e.g. KIYOYO05"
        value={editingStore.pospal_account ?? ""}
        onChange={(event) =>
          setEditingStore({
            ...editingStore,
            pospal_account: event.target.value.trim() || null,
          })
        }
      />
    </label>
    <div className="form-split">
      <label className="form-field">
        <span>Latitude</span>
        <input
          type="number"
          step="0.000001"
          value={editingStore.lat ?? ""}
          onChange={(event) =>
            setEditingStore({
              ...editingStore,
              lat: event.target.value ? Number(event.target.value) : null,
            })
          }
        />
      </label>
      <label className="form-field">
        <span>Longitude</span>
        <input
          type="number"
          step="0.000001"
          value={editingStore.lng ?? ""}
          onChange={(event) =>
            setEditingStore({
              ...editingStore,
              lng: event.target.value ? Number(event.target.value) : null,
            })
          }
        />
      </label>
    </div>
    <div className="store-switches">
      <label>
        <input
          type="checkbox"
          checked={editingStore.pickup_enabled}
          onChange={(event) =>
            setEditingStore({
              ...editingStore,
              pickup_enabled: event.target.checked,
            })
          }
        />
        Pickup enabled
      </label>
      <label>
        <input
          type="checkbox"
          checked={editingStore.delivery_enabled}
          onChange={(event) =>
            setEditingStore({
              ...editingStore,
              delivery_enabled: event.target.checked,
            })
          }
        />
        Delivery enabled
      </label>
      <label>
        <input
          type="checkbox"
          checked={editingStore.location_verified}
          onChange={(event) =>
            setEditingStore({
              ...editingStore,
              location_verified: event.target.checked,
            })
          }
        />
        Location verified by operations
      </label>
      <label>
        <input
          type="checkbox"
          checked={editingStore.pospal_enabled !== false}
          onChange={(event) =>
            setEditingStore({
              ...editingStore,
              pospal_enabled: event.target.checked,
            })
          }
        />
        POSPAL enabled
      </label>
    </div>
    <button className="primary full" onClick={() => void saveStore()}>
      Save store →
    </button>
  </section>
</div>
  );
}
