import { useState } from "react";
import type { AuthErrorCode, AuthProvider, AuthSession } from "../../../auth/types";
import type { CustomerCopy } from "../core/copy";
import { PasswordFields } from "./PasswordFields";

const providers: AuthProvider[] = ["password", "google", "facebook"];

export function ProviderManager({
  session,
  t,
  busy,
  error,
  linkProvider,
  linkPassword,
  unlinkProvider,
}: {
  session: AuthSession;
  t: CustomerCopy;
  busy: boolean;
  error: AuthErrorCode | null;
  linkProvider: (provider: "google" | "facebook") => Promise<unknown>;
  linkPassword: (email: string, password: string) => Promise<unknown>;
  unlinkProvider: (provider: AuthProvider) => Promise<unknown>;
}) {
  const [addingPassword, setAddingPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localError, setLocalError] = useState("");

  const addPassword = () => {
    setLocalError("");
    if (!session.email) return setLocalError(t.emailRequired);
    if (password.length < 10) return setLocalError(t.passwordHelp);
    if (password !== confirmPassword) return setLocalError(t.passwordMismatch);
    void linkPassword(session.email, password).then(() => {
      setAddingPassword(false);
      setPassword("");
      setConfirmPassword("");
    }).catch(() => undefined);
  };

  return (
    <section className="provider-manager" aria-labelledby="provider-manager-title">
      <div>
        <span className="eyebrow">{t.security}</span>
        <h3 id="provider-manager-title">{t.signInMethods}</h3>
        <p>{t.signInMethodsHelp}</p>
      </div>
      <div className="provider-list">
        {providers.map((provider) => {
          const linked = session.providers.includes(provider);
          return (
            <div key={provider}>
              <span><b>{provider === "password" ? "@" : provider === "google" ? "G" : "f"}</b>{t.providerNames[provider]}</span>
              {linked ? (
                <button
                  disabled={busy || session.providers.length === 1}
                  title={session.providers.length === 1 ? t.lastProvider : undefined}
                  onClick={() => void unlinkProvider(provider).catch(() => undefined)}
                >
                  {session.providers.length === 1 ? t.onlyMethod : t.removeMethod}
                </button>
              ) : provider === "password" ? (
                <button disabled={busy} onClick={() => setAddingPassword(true)}>{t.addMethod}</button>
              ) : (
                <button disabled={busy} onClick={() => void linkProvider(provider).catch(() => undefined)}>{t.addMethod}</button>
              )}
            </div>
          );
        })}
      </div>
      {addingPassword && (
        <div className="provider-password">
          <PasswordFields
            password={password}
            confirmPassword={confirmPassword}
            setPassword={setPassword}
            setConfirmPassword={setConfirmPassword}
            requireConfirmation
            t={t}
          />
          <div>
            <button className="primary" disabled={busy} onClick={addPassword}>{t.addPassword}</button>
            <button className="text-button" onClick={() => setAddingPassword(false)}>{t.cancel}</button>
          </div>
        </div>
      )}
      {(localError || error) && <div className="form-error" role="alert">{localError || t.authErrors[error ?? "unknown"]}</div>}
    </section>
  );
}
