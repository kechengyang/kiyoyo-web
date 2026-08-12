"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  applyEmailVerification,
  applyPasswordReset,
  inspectEmailAction,
  inspectPasswordReset,
  validateMemberPassword,
} from "../service";
import { copy } from "../../components/customer/core/copy";
import { PasswordFields } from "../../components/customer/auth/PasswordFields";
import type { Lang } from "../../types";

type ActionMode = "verifyEmail" | "resetPassword" | "recoverEmail" | "invalid";
type ActionState = "checking" | "ready" | "success" | "error";

export default function AuthActionPage() {
  const [lang, setLang] = useState<Lang>("en");
  const [mode, setMode] = useState<ActionMode>("invalid");
  const [code, setCode] = useState("");
  const [state, setState] = useState<ActionState>("checking");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const t = copy[lang];

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nextLang = params.get("lang") === "zh" ? "zh" : "en";
    const nextMode = params.get("mode") as ActionMode | null;
    const nextCode = params.get("oobCode") ?? "";
    document.documentElement.lang = nextLang;
    void Promise.resolve().then(async () => {
      setLang(nextLang);
      setMode(nextMode ?? "invalid");
      setCode(nextCode);
      if (!nextCode || !["verifyEmail", "resetPassword", "recoverEmail"].includes(nextMode ?? "")) {
        setState("error");
        return;
      }
      try {
        if (nextMode === "resetPassword") {
          await inspectPasswordReset(nextCode);
          setState("ready");
          return;
        }
        await inspectEmailAction(nextCode);
        await applyEmailVerification(nextCode);
        setState("success");
      } catch {
        setState("error");
      }
    });
  }, []);

  const resetPassword = (event: FormEvent) => {
    event.preventDefault();
    setError("");
    void validateMemberPassword(password)
      .then((result) => {
        if (password.length < 10 || !result.isValid) throw new Error("WEAK_PASSWORD");
        if (password !== confirmPassword) throw new Error("PASSWORD_MISMATCH");
        return applyPasswordReset(code, password);
      })
      .then(() => setState("success"))
      .catch((resetError) => {
        setError(
          resetError instanceof Error && resetError.message === "PASSWORD_MISMATCH"
            ? t.passwordMismatch
            : t.passwordHelp,
        );
      });
  };

  const title =
    mode === "resetPassword" ? t.resetPassword : t.verifyEmail;

  return (
    <main className="auth-action-page">
      <section className="auth-modal">
        <Link className="logo" href="/">KIYOYO</Link>
        <span className="auth-kicker">{t.security}</span>
        <h1>{title}</h1>
        {state === "checking" && <p role="status">{t.working}…</p>}
        {state === "error" && (
          <>
            <div className="form-error" role="alert">{t.actionLinkInvalid}</div>
            <Link className="primary full auth-action-link" href="/">{t.backToSignIn} →</Link>
          </>
        )}
        {state === "ready" && mode === "resetPassword" && (
          <form onSubmit={resetPassword}>
            <p>{t.chooseNewPassword}</p>
            <PasswordFields
              password={password}
              confirmPassword={confirmPassword}
              setPassword={setPassword}
              setConfirmPassword={setConfirmPassword}
              requireConfirmation
              t={t}
            />
            {error && <div className="form-error" role="alert">{error}</div>}
            <button className="primary full" type="submit">{t.resetPassword} →</button>
          </form>
        )}
        {state === "success" && (
          <>
            <div className="form-success" role="status">
              {mode === "resetPassword" ? t.passwordResetComplete : t.emailVerifiedComplete}
            </div>
            <Link className="primary full auth-action-link" href="/">{t.backToSignIn} →</Link>
          </>
        )}
      </section>
    </main>
  );
}
