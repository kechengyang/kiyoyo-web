import { useState, type FormEvent } from "react";
import type {
  AuthErrorCode,
  AuthMode,
  AuthProvider,
  AuthSession,
} from "../../../auth/types";
import { validateMemberPassword } from "../../../auth/service";
import type { CustomerCopy } from "../core/copy";
import { DialogBackdrop } from "../shared/DialogBackdrop";
import { Logo } from "../shared/primitives";
import { PasswordFields } from "./PasswordFields";

type AuthView = AuthMode | "forgot";

export function AuthDialog({
  initialMode,
  t,
  busy,
  error,
  onClose,
  onAuthenticate,
  onPasswordReset,
  onSuccess,
  clearError,
}: {
  initialMode: AuthMode;
  t: CustomerCopy;
  busy: boolean;
  error: AuthErrorCode | null;
  onClose: () => void;
  onAuthenticate: (
    provider: AuthProvider,
    mode: AuthMode,
    email?: string,
    password?: string,
  ) => Promise<AuthSession | null>;
  onPasswordReset: (email: string) => Promise<void>;
  onSuccess: (session: AuthSession | null) => void;
  clearError: () => void;
}) {
  const [view, setView] = useState<AuthView>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localError, setLocalError] = useState("");
  const [notice, setNotice] = useState("");

  const switchView = (next: AuthView) => {
    setView(next);
    setPassword("");
    setConfirmPassword("");
    setLocalError("");
    setNotice("");
    clearError();
  };

  const authenticate = async (provider: AuthProvider) => {
    setLocalError("");
    setNotice("");
    if (provider === "password") {
      if (!email.trim().includes("@")) {
        setLocalError(t.invalidEmail);
        return;
      }
      if (view === "signup") {
        const passwordStatus = await validateMemberPassword(password).catch(
          () => null,
        );
        if (password.length < 10 || passwordStatus?.isValid === false) {
          setLocalError(t.passwordHelp);
          return;
        }
        if (password !== confirmPassword) {
          setLocalError(t.passwordMismatch);
          return;
        }
      }
    }
    try {
      const session = await onAuthenticate(
        provider,
        view === "signup" ? "signup" : "signin",
        email.trim().toLowerCase(),
        password,
      );
      onSuccess(session);
    } catch {
      // The shared auth error is announced below.
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (view === "forgot") {
      if (!email.trim().includes("@")) {
        setLocalError(t.invalidEmail);
        return;
      }
      void onPasswordReset(email)
        .then(() => setNotice(t.resetSent))
        .catch(() => undefined);
      return;
    }
    void authenticate("password");
  };

  return (
    <DialogBackdrop onClose={onClose} ariaLabel={t.authTitle}>
      <form className="auth-modal" onSubmit={submit} noValidate>
        <button className="modal-close" type="button" onClick={onClose} aria-label={t.close}>
          ×
        </button>
        <Logo />
        <span className="auth-kicker">
          {view === "signup"
            ? t.createAccount
            : view === "forgot"
              ? t.forgotPassword
              : t.signIn}
        </span>
        <h2>{view === "forgot" ? t.resetPassword : t.authTitle}</h2>
        <p>{view === "forgot" ? t.resetPasswordHelp : t.authSub}</p>

        {view !== "forgot" && (
          <>
            <button
              className="social google"
              type="button"
              disabled={busy}
              onClick={() => void authenticate("google")}
            >
              <b aria-hidden="true">G</b>{t.continueGoogle}
            </button>
            <button
              className="social facebook"
              type="button"
              disabled={busy}
              onClick={() => void authenticate("facebook")}
            >
              <b aria-hidden="true">f</b>{t.continueFacebook}
            </button>
            <div className="auth-divider"><span>{t.or}</span></div>
          </>
        )}

        <label className="form-field">
          <span>{t.email}</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            inputMode="email"
            required
          />
        </label>
        {view !== "forgot" && (
          <PasswordFields
            password={password}
            confirmPassword={confirmPassword}
            setPassword={setPassword}
            setConfirmPassword={setConfirmPassword}
            requireConfirmation={view === "signup"}
            t={t}
          />
        )}
        {(localError || error) && (
          <div className="form-error" role="alert">
            {localError || t.authErrors[error ?? "unknown"]}
          </div>
        )}
        {notice && <div className="form-success" role="status">{notice}</div>}
        <button className="primary full" type="submit" disabled={busy || Boolean(notice)}>
          {busy
            ? t.working
            : view === "signup"
              ? t.createAccount
              : view === "forgot"
                ? t.sendReset
                : t.signIn} →
        </button>
        {view === "signin" && (
          <button className="auth-switch" type="button" onClick={() => switchView("forgot")}>
            {t.forgotPassword}
          </button>
        )}
        <button
          className="auth-switch"
          type="button"
          onClick={() => switchView(view === "signup" ? "signin" : "signup")}
        >
          {view === "signup" ? t.haveAccount : t.needAccount}
        </button>
        {view === "signup" && <small className="auth-terms">{t.authTerms}</small>}
      </form>
    </DialogBackdrop>
  );
}
