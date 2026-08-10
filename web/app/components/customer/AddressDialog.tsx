import type { Dispatch, SetStateAction } from "react";
import type { Address, UserProfile } from "../../types";
import type { CustomerCopy } from "./copy";

export function AddressDialog({
  setAddressModal, addressForm, setAddressForm, profile, t, addressError, saveAddress,
}: {
  setAddressModal: Dispatch<SetStateAction<boolean>>;
  addressForm: Address;
  setAddressForm: Dispatch<SetStateAction<Address>>;
  profile: UserProfile;
  t: CustomerCopy;
  addressError: string;
  saveAddress: () => void;
}) {
  return (
<div className="modal-backdrop">
  <div className="address-modal">
    <button
      className="modal-close"
      onClick={() => setAddressModal(false)}
    >
      ×
    </button>
    <span className="sticker">NAIROBI DELIVERY</span>
    <h2>
      {addressForm.id &&
      profile.addresses.some((a) => a.id === addressForm.id)
        ? t.editAddress
        : t.addAddress}
    </h2>
    <div className="form-split">
      <label className="form-field">
        <span>{t.addressLabel}</span>
        <input
          value={addressForm.label}
          onChange={(e) =>
            setAddressForm({ ...addressForm, label: e.target.value })
          }
        />
      </label>
      <label className="form-field">
        <span>{t.recipient}</span>
        <input
          value={addressForm.recipient}
          onChange={(e) =>
            setAddressForm({
              ...addressForm,
              recipient: e.target.value,
            })
          }
        />
      </label>
    </div>
    <label className="form-field">
      <span>{t.phone}</span>
      <input
        type="tel"
        value={addressForm.phone}
        onChange={(e) =>
          setAddressForm({ ...addressForm, phone: e.target.value })
        }
        placeholder="+254 7•• ••• •••"
      />
    </label>
    <label className="form-field">
      <span>{t.area}</span>
      <input
        value={addressForm.area}
        onChange={(e) =>
          setAddressForm({ ...addressForm, area: e.target.value })
        }
        placeholder="Kilimani, Westlands, CBD…"
      />
    </label>
    <label className="form-field">
      <span>{t.addressLine}</span>
      <input
        value={addressForm.line1}
        onChange={(e) =>
          setAddressForm({ ...addressForm, line1: e.target.value })
        }
      />
    </label>
    <label className="form-field">
      <span>{t.instructions}</span>
      <textarea
        value={addressForm.instructions}
        onChange={(e) =>
          setAddressForm({
            ...addressForm,
            instructions: e.target.value,
          })
        }
      />
    </label>
    <label className="default-check">
      <input
        type="checkbox"
        checked={addressForm.isDefault}
        onChange={(e) =>
          setAddressForm({
            ...addressForm,
            isDefault: e.target.checked,
          })
        }
      />
      <span>{t.makeDefault}</span>
    </label>
    {addressError && <div className="form-error">{addressError}</div>}
    <button className="primary full" onClick={saveAddress}>
      {t.save} →
    </button>
  </div>
</div>
  );
}
