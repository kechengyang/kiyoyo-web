import type { Dispatch, SetStateAction } from "react";
import { sendMemberPasswordReset } from "../../../platform";
import type { AuthProvider, Lang } from "../../../types";
import type { CustomerCopy } from "../core/copy";
import { DialogBackdrop } from "../shared/DialogBackdrop";
import { Logo } from "../shared/primitives";

type AuthMode = "signin" | "signup";
type AuthForm = { email: string; password: string };

export function AuthDialog({
  authMode, setAuthMode, setPendingCheckout, t, completeAuth, authForm,
  setAuthForm, authError, setAuthError, lang,
}: {
  authMode: AuthMode;
  setAuthMode: Dispatch<SetStateAction<AuthMode | null>>;
  setPendingCheckout: Dispatch<SetStateAction<boolean>>;
  t: CustomerCopy;
  completeAuth: (provider: AuthProvider) => void;
  authForm: AuthForm;
  setAuthForm: Dispatch<SetStateAction<AuthForm>>;
  authError: string;
  setAuthError: Dispatch<SetStateAction<string>>;
  lang: Lang;
}) {
  return (
<DialogBackdrop
  onClose={() => {
    setAuthMode(null);
    setPendingCheckout(false);
  }}
>
  <div className="auth-modal">
    <button
      className="modal-close"
      onClick={() => {
        setAuthMode(null);
        setPendingCheckout(false);
      }}
    >
      ×
    </button>
    <Logo />
    <span className="auth-kicker">
      {authMode === "signup" ? t.createAccount : t.signIn}
    </span>
    <h2>{t.authTitle}</h2>
    <p>{t.authSub}</p>
    <button
      className="social google"
      onClick={() => completeAuth("google")}
    >
      <b>G</b>
      {t.continueGoogle}
    </button>
    <button
      className="social facebook"
      onClick={() => completeAuth("facebook")}
    >
      <b>f</b>
      {t.continueFacebook}
    </button>
    <div className="auth-divider">
      <span>{t.or}</span>
    </div>
    <label className="form-field">
      <span>{t.email}</span>
      <input
        type="email"
        value={authForm.email}
        onChange={(e) =>
          setAuthForm({ ...authForm, email: e.target.value })
        }
        placeholder="you@example.com"
        autoComplete="email"
      />
    </label>
    <label className="form-field">
      <span>{t.password}</span>
      <input
        type="password"
        value={authForm.password}
        onChange={(e) =>
          setAuthForm({ ...authForm, password: e.target.value })
        }
        placeholder="6+ characters"
        autoComplete={
          authMode === "signup" ? "new-password" : "current-password"
        }
      />
    </label>
    {authError && <div className="form-error">{authError}</div>}
    <button
      className="primary full"
      onClick={() => completeAuth("password")}
    >
      {authMode === "signup" ? t.createAccount : t.signIn} →
    </button>
    <button
      className="auth-switch"
      onClick={() => {
        setAuthMode(authMode === "signup" ? "signin" : "signup");
        setAuthError("");
      }}
    >
      {authMode === "signup"
        ? lang === "zh"
          ? "已有账号？登录"
          : "Already a member? Sign in"
        : lang === "zh"
          ? "还没有账号？注册"
          : "New here? Create account"}
    </button>
    {authMode === "signin" && (
      <button
        className="auth-switch auth-reset"
        onClick={async () => {
          const email = authForm.email.trim();
          if (!email.includes("@")) {
            setAuthError(
              lang === "zh"
                ? "请先输入需要重置密码的邮箱。"
                : "Enter your email first to reset the password.",
            );
            return;
          }
          try {
            await sendMemberPasswordReset(email);
            setAuthError(
              lang === "zh"
                ? "密码重置邮件已发送。"
                : "Password reset email sent.",
            );
          } catch (error) {
            setAuthError(
              error instanceof Error
                ? error.message
                : "Password reset could not be sent",
            );
          }
        }}
      >
        {lang === "zh" ? "忘记密码？" : "Forgot password?"}
      </button>
    )}
    <small className="auth-test">ⓘ {t.testAuth}</small>
  </div>
</DialogBackdrop>
  );
}
