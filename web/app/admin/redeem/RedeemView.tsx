import type { Dispatch, RefObject, SetStateAction } from "react";
import { money } from "../../data";
import type { Order } from "../../types";
import type { AdminStore } from "../core/types";

export function RedeemView({
  storeFilter, setStoreFilter, adminStores, scannerActive, videoRef,
  stopScanner, startScanner, scan, setScan, redeem, scanResult,
}: {
  storeFilter: string;
  setStoreFilter: Dispatch<SetStateAction<string>>;
  adminStores: AdminStore[];
  scannerActive: boolean;
  videoRef: RefObject<HTMLVideoElement | null>;
  stopScanner: () => void;
  startScanner: () => Promise<void>;
  scan: string;
  setScan: Dispatch<SetStateAction<string>>;
  redeem: () => void;
  scanResult: { ok: boolean; message: string; order?: Order } | null;
}) {
  return (
<div className="redeem-layout">
  <section className="redeem-card">
    <span className="red-label">ONE-TIME PICKUP</span>
    <h2>Scan or enter code</h2>
    <p>
      Scan the customer’s signed QR pickup token. A completed code
      cannot be used twice.
    </p>
    <label className="redeem-store-select">
      <span>Pickup store</span>
      <select
        value={storeFilter}
        onChange={(event) => setStoreFilter(event.target.value)}
      >
        <option value="all">Choose store</option>
        {adminStores
          .filter((store) => store.pickup_enabled)
          .map((store) => (
            <option key={store.id} value={store.code}>
              {store.name}
            </option>
          ))}
      </select>
    </label>
    <div className={`scanner-frame ${scannerActive ? "active" : ""}`}>
      {scannerActive ? (
        <video ref={videoRef} muted playsInline aria-label="QR camera" />
      ) : (
        <>
          <div className="scanner-line" />
          <span>⌗</span>
          <small>Camera ready</small>
        </>
      )}
    </div>
    <button
      className="camera-scan-button"
      onClick={() =>
        scannerActive ? stopScanner() : void startScanner()
      }
    >
      {scannerActive ? "Stop camera" : "Scan customer QR"} →
    </button>
    <label>
      <span>Pickup QR token</span>
      <div>
        <input
          value={scan}
          onChange={(e) => setScan(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && redeem()}
          placeholder="Paste signed QR token"
        />
        <button onClick={redeem}>Verify →</button>
      </div>
    </label>
  </section>
  <aside
    className={`scan-result ${scanResult ? (scanResult.ok ? "ok" : "bad") : ""}`}
  >
    {scanResult ? (
      <>
        <span>{scanResult.ok ? "✓" : "!"}</span>
        <h3>{scanResult.ok ? "Verified" : "Cannot redeem"}</h3>
        <p>{scanResult.message}</p>
        {scanResult.order && (
          <div>
            <b>{scanResult.order.id}</b>
            <small>
              {
                adminStores.find(
                  (store) =>
                    store.code === scanResult.order?.storeId,
                )?.name
              }
            </small>
            <strong>{money(scanResult.order.total)}</strong>
          </div>
        )}
      </>
    ) : (
      <>
        <span>⌗</span>
        <h3>Waiting for a code</h3>
        <p>
          The verification result and order summary will appear here.
        </p>
      </>
    )}
  </aside>
</div>
  );
}
