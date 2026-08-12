import { useState } from "react";
import type { CustomerCopy } from "../core/copy";

export function PasswordFields({
  password,
  confirmPassword,
  setPassword,
  setConfirmPassword,
  requireConfirmation,
  t,
}: {
  password: string;
  confirmPassword: string;
  setPassword: (value: string) => void;
  setConfirmPassword: (value: string) => void;
  requireConfirmation: boolean;
  t: CustomerCopy;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <>
      <label className="form-field password-field">
        <span>{t.password}</span>
        <span className="password-control">
          <input
            type={visible ? "text" : "password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete={requireConfirmation ? "new-password" : "current-password"}
            minLength={requireConfirmation ? 10 : undefined}
            required
          />
          <button
            type="button"
            aria-pressed={visible}
            onClick={() => setVisible((current) => !current)}
          >
            {visible ? t.hidePassword : t.showPassword}
          </button>
        </span>
      </label>
      {requireConfirmation && (
        <>
          <small className="password-help">{t.passwordHelp}</small>
          <label className="form-field">
            <span>{t.confirmPassword}</span>
            <input
              type={visible ? "text" : "password"}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              minLength={10}
              required
            />
          </label>
        </>
      )}
    </>
  );
}
