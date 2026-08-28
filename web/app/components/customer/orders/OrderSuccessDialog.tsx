import type { Dispatch, SetStateAction } from "react";
import type { Order, Tab, UserProfile } from "../../../types";
import type { CustomerCopy } from "../core/copy";
import { DialogBackdrop } from "../shared/DialogBackdrop";
import { PickupQR } from "../shared/primitives";

export function OrderSuccessDialog({ success, setSuccess, t, profile, go }: {
  success: Order;
  setSuccess: Dispatch<SetStateAction<Order | null>>;
  t: CustomerCopy;
  profile: UserProfile;
  go: (tab: Tab) => void;
}) {
  return (
<DialogBackdrop
  onClose={() => {
    setSuccess(null);
    go("home");
  }}
>
  <div className="success-modal">
    <span className="success-pop">✓</span>
    <h2>{t.success}</h2>
    <strong className="order-number">{success.id}</strong>
    {(success.pointsEarned ?? 0) > 0 && <p>+{success.pointsEarned} {t.points}</p>}
    {success.channel === "Pickup" ? (
      <>
        <PickupQR code={success.pickupCode} />
        <code>{success.pickupCode}</code>
        <p>{t.qrHelp}</p>
      </>
    ) : (
      <>
        <div className="delivery-success">⌁</div>
        <p>
          {success.channel} ·{" "}
          {
            profile.addresses.find((a) => a.id === success.addressId)
              ?.line1
          }
        </p>
      </>
    )}
    <button
      className="primary full"
      onClick={() => {
        setSuccess(null);
        go("home");
      }}
    >
      {t.done}
    </button>
  </div>
</DialogBackdrop>
  );
}
