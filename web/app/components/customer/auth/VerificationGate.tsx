import { useState } from "react";
import type { AuthErrorCode } from "../../../auth/types";
import type { CustomerCopy } from "../core/copy";
import { DialogBackdrop } from "../shared/DialogBackdrop";

export function VerificationGate({
  email,
  t,
  busy,
  error,
  onClose,
  onResend,
  onRefresh,
}: {
  email: string | null;
  t: CustomerCopy;
  busy: boolean;
  error: AuthErrorCode | null;
  onClose: () => void;
  onResend: () => Promise<void>;
  onRefresh: () => Promise<boolean>;
}) {
  const [sent, setSent] = useState(false);
  const [checking, setChecking] = useState(false);
  const [localError, setLocalError] = useState("");
  return (
    <DialogBackdrop onClose={onClose} ariaLabel={t.verifyEmail}>
      <div className="auth-modal verification-gate">
        <button className="modal-close" onClick={onClose} aria-label={t.close}>×</button>
        <span className="auth-kicker">{t.checkout}</span>
        <h2>{t.verifyEmail}</h2>
        <p>{t.verifyEmailHelp}</p>
        <strong>{email}</strong>
        {sent && <div className="form-success" role="status">{t.verificationSent}</div>}
        {(localError || error) && (
          <div className="form-error" role="alert">
            {localError || t.authErrors[error ?? "unknown"]}
          </div>
        )}
        <button
          className="primary full"
          disabled={busy || checking}
          onClick={() => {
            setLocalError("");
            setChecking(true);
            void onRefresh()
              .then((verified) => {
                if (!verified) setLocalError(t.verificationNotComplete);
              })
              .catch(() => undefined)
              .finally(() => setChecking(false));
          }}
        >
          {checking ? t.working : t.checkVerification} →
        </button>
        <button
          className="auth-switch"
          disabled={busy || sent}
          onClick={() => {
            setLocalError("");
            void onResend()
              .then(() => setSent(true))
              .catch(() => undefined);
          }}
        >
          {sent ? t.verificationSent : t.resendVerification}
        </button>
      </div>
    </DialogBackdrop>
  );
}
