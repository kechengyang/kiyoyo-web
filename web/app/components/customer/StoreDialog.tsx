import type { Dispatch, SetStateAction } from "react";
import { stores } from "../../data";
import type { Lang } from "../../types";
import GoogleStoreMap from "../GoogleStoreMap";
import type { CustomerCopy } from "./copy";

export function StoreDialog({
  t, lang, setStoreModal, locate, locating, locationError, storeId, setStoreId, distances,
}: {
  t: CustomerCopy;
  lang: Lang;
  setStoreModal: Dispatch<SetStateAction<boolean>>;
  locate: () => void;
  locating: boolean;
  locationError: boolean;
  storeId: string;
  setStoreId: Dispatch<SetStateAction<string>>;
  distances: Record<string, number>;
}) {
  return (
<div
  className="modal-backdrop"
  onMouseDown={(e) =>
    e.currentTarget === e.target && setStoreModal(false)
  }
>
  <div className="store-modal">
    <button
      className="modal-close"
      onClick={() => setStoreModal(false)}
    >
      ×
    </button>
    <span className="sticker">6 NAIROBI STORES</span>
    <h2>{t.storeTitle}</h2>
    <p>{t.storeSub}</p>
    <button
      className="locate-button"
      onClick={locate}
      disabled={locating}
    >
      ⌖ {locating ? "Locating…" : t.useLocation}
    </button>
    {locationError && (
      <small className="error">{t.locationDenied}</small>
    )}
    <GoogleStoreMap
      lang={lang}
      stores={stores}
      selectedStoreId={storeId}
      onSelect={setStoreId}
    />
    <div className="store-list">
      {stores.map((store, index) => (
        <button
          key={store.id}
          disabled={!store.lat}
          className={store.id === storeId ? "selected" : ""}
          onClick={() => {
            setStoreId(store.id);
            setStoreModal(false);
          }}
        >
          <span className="store-index">0{index + 1}</span>
          <span>
            <strong>{store.name}</strong>
            <small>{store.address}</small>
            <em>{store.verified ? store.phone : t.unverified}</em>
          </span>
          {distances[store.id] !== undefined && (
            <b>
              {distances[store.id].toFixed(1)} km
              {Object.values(distances).sort((a, b) => a - b)[0] ===
              distances[store.id]
                ? ` · ${t.closest}`
                : ""}
            </b>
          )}
        </button>
      ))}
    </div>
  </div>
</div>
  );
}
