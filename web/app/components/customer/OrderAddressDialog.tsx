import type { Dispatch, SetStateAction } from "react";
import type { Address, UserProfile } from "../../types";
import type { CustomerCopy } from "./copy";
import { DialogBackdrop } from "./DialogBackdrop";

export function OrderAddressDialog({ editingOrderId, setEditingOrderId, profile, changeOrderAddress, t, openAddress }: {
  editingOrderId: string;
  setEditingOrderId: Dispatch<SetStateAction<string | null>>;
  profile: UserProfile;
  changeOrderAddress: (addressId: string) => void;
  t: CustomerCopy;
  openAddress: (address?: Address) => void;
}) {
  return (
<DialogBackdrop onClose={() => setEditingOrderId(null)}>
  <div className="order-address-modal">
    <button
      className="modal-close"
      onClick={() => setEditingOrderId(null)}
    >
      ×
    </button>
    <span className="sticker">ACTIVE ORDER</span>
    <h2>{t.changeAddress}</h2>
    <p>{editingOrderId}</p>
    {profile.addresses.map((address) => (
      <button
        key={address.id}
        onClick={() => changeOrderAddress(address.id)}
      >
        <strong>
          {address.label}
          {address.isDefault ? ` · ${t.defaultAddress}` : ""}
        </strong>
        <span>
          {address.recipient} · {address.line1}, {address.area}
        </span>
      </button>
    ))}
    <button className="add-order-address" onClick={() => openAddress()}>
      + {t.addAddress}
    </button>
  </div>
</DialogBackdrop>
  );
}
