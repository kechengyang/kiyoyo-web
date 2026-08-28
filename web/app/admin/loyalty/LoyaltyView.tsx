import { useState } from "react";
import type { LoyaltySettings } from "../core/types";

export function LoyaltyView({
  settings,
  saveSettings,
  busy,
  error,
}: {
  settings: LoyaltySettings | null;
  saveSettings: (earnRatePercent: number) => Promise<void>;
  busy: boolean;
  error: string;
}) {
  const [rate, setRate] = useState(() => String(settings?.earn_rate_percent ?? 1));
  const value = Number(rate);
  const valid = Number.isFinite(value) && value >= 0 && value <= 100;

  return (
    <section className="loyalty-admin" aria-labelledby="loyalty-title">
      <header>
        <span className="red-label">LOYALTY / 积分</span>
        <h2 id="loyalty-title">Default points rule</h2>
        <p>Set how many points a member earns from eligible paid merchandise. / 设置会员实付商品金额的默认积分比例。</p>
      </header>
      <div className="loyalty-settings-card">
        <div>
          <strong>Earn rate / 积分比例</strong>
          <p>At 1%, KSh 1,000 of eligible spend earns 10 points.</p>
        </div>
        <label className="form-field">
          <span>Percent / 百分比</span>
          <div className="loyalty-rate-input">
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={rate}
              onChange={(event) => setRate(event.target.value)}
            />
            <b>%</b>
          </div>
        </label>
        <dl>
          <div><dt>Redemption / 抵扣</dt><dd>1 point = KSh 1</dd></div>
          <div><dt>Earn basis / 获得基础</dt><dd>Paid merchandise after coupon and points; delivery excluded</dd></div>
          <div><dt>Rounding / 取整</dt><dd>Whole points, rounded down</dd></div>
        </dl>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="primary" disabled={!valid || busy || !settings} onClick={() => void saveSettings(value)}>
          {busy ? "Saving…" : "Save default rate / 保存默认比例"}
        </button>
        {settings && <small>Last saved {new Date(settings.updated_at).toLocaleString("en-KE", { timeZone: "Africa/Nairobi" })}</small>}
      </div>
    </section>
  );
}
