import { useRef, useState, type FormEvent } from "react";
import type { AuthErrorCode, AuthSession } from "../../../auth/types";
import { normalizeKenyanMobile } from "../../../auth/phone";
import type { CustomerCopy } from "../core/copy";
import { DialogBackdrop } from "../shared/DialogBackdrop";

export function PhoneVerificationGate({
  t,
  busy,
  error,
  onClose,
  onClearError,
  onReset,
  onSend,
  onConfirm,
}: {
  t: CustomerCopy;
  busy: boolean;
  error: AuthErrorCode | null;
  onClose: () => void;
  onClearError: () => void;
  onReset: () => void;
  onSend: (phoneNumber: string, recaptchaContainer: HTMLElement) => Promise<void>;
  onConfirm: (code: string) => Promise<AuthSession | null>;
}) {
  const recaptchaRef = useRef<HTMLDivElement>(null);
  const [phone, setPhone] = useState("");
  const [verifiedPhone, setVerifiedPhone] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [localError, setLocalError] = useState("");

  const sendCode = async () => {
    const normalized = normalizeKenyanMobile(phone);
    if (!normalized || !recaptchaRef.current) {
      setLocalError(t.phoneInvalid);
      return;
    }
    setLocalError("");
    await onSend(normalized, recaptchaRef.current);
    setVerifiedPhone(normalized);
    setCodeSent(true);
    setCode("");
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!codeSent) {
      void sendCode().catch(() => undefined);
      return;
    }
    if (!/^\d{6}$/.test(code)) {
      setLocalError(t.codeInvalid);
      return;
    }
    setLocalError("");
    void onConfirm(code).catch(() => undefined);
  };

  return (
    <DialogBackdrop onClose={onClose} ariaLabel={t.verifyPhone}>
      <form className="auth-modal phone-verification-gate" onSubmit={submit} noValidate>
        <button className="modal-close" type="button" onClick={onClose} aria-label={t.close}>×</button>
        <span className="auth-kicker">{t.member}</span>
        <h2>{t.verifyPhone}</h2>
        <p>{t.verifyPhoneHelp}</p>

        {!codeSent ? (
          <label className="form-field">
            <span>{t.kenyaPhone}</span>
            <input
              type="tel"
              value={phone}
              onChange={(event) => {
                setPhone(event.target.value);
                setLocalError("");
                onClearError();
              }}
              placeholder="0712 345 678"
              autoComplete="tel"
              inputMode="tel"
              disabled={busy}
              aria-describedby="phone-verification-consent"
              required
            />
          </label>
        ) : (
          <>
            <div className="phone-code-destination" role="status">
              {t.phoneCodeSent} <strong>{verifiedPhone}</strong>
            </div>
            <label className="form-field">
              <span>{t.verificationCode}</span>
              <input
                type="text"
                value={code}
                onChange={(event) => {
                  setCode(event.target.value.replace(/\D/g, "").slice(0, 6));
                  setLocalError("");
                  onClearError();
                }}
                placeholder="123456"
                autoComplete="one-time-code"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                disabled={busy}
                autoFocus
                required
              />
            </label>
          </>
        )}

        <small id="phone-verification-consent" className="phone-consent">
          {t.phoneConsent}
        </small>
        <div ref={recaptchaRef} className="phone-recaptcha" />
        {(localError || error) && (
          <div className="form-error" role="alert">
            {localError || t.authErrors[error ?? "unknown"]}
          </div>
        )}
        <button className="primary full" type="submit" disabled={busy}>
          {busy ? t.working : codeSent ? t.confirmPhone : t.sendPhoneCode} →
        </button>
        {codeSent && (
          <button
            className="auth-switch"
            type="button"
            disabled={busy}
            onClick={() => {
              onReset();
              setCodeSent(false);
              setCode("");
              setLocalError("");
            }}
          >
            {t.changePhone}
          </button>
        )}
      </form>
    </DialogBackdrop>
  );
}
