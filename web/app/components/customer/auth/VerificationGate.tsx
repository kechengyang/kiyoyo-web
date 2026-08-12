import { useState } from "react";
import type { CustomerCopy } from "../core/copy";
import { DialogBackdrop } from "../shared/DialogBackdrop";

export function VerificationGate({
  email,
  t,
  busy,
  onClose,
  onResend,
  onRefresh,
}: {
  email: string | null;
  t: CustomerCopy;
  busy: boolean;
  onClose: () => void;
  onResend: () => Promise<void>;
  onRefresh: () => Promise<boolean>;
}) {
  const [sent, setSent] = useState(false);
  const [checking, setChecking] = useState(false);
  return (
    <DialogBackdrop onClose={onClose} ariaLabel={t.verifyEmail}>
      <div className="auth-modal verification-gate">
        <button className="modal-close" onClick={onClose} aria-label={t.close}>×</button>
        <span className="auth-kicker">{t.checkout}</span>
        <h2>{t.verifyEmail}</h2>
        <p>{t.verifyEmailHelp}</p>
        <strong>{email}</strong>
        {sent && <div className="form-success" role="status">{t.verificationSent}</div>}
        <button
          className="primary full"
          disabled={busy || checking}
          onClick={() => {
            setChecking(true);
            void onRefresh().finally(() => setChecking(false));
          }}
        >
          {checking ? t.working : t.checkVerification} →
        </button>
        <button
          className="auth-switch"
          disabled={busy || sent}
          onClick={() => void onResend().then(() => setSent(true))}
        >
          {sent ? t.verificationSent : t.resendVerification}
        </button>
      </div>
    </DialogBackdrop>
  );
}
