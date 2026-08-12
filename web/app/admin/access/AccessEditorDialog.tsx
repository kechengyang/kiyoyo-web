import { useEffect, useRef, useState } from "react";
import type { AdminStore, StaffAccount, StaffRole } from "../core/types";

export type StaffAccessDraft = {
  username: string;
  displayName: string;
  role: StaffRole;
  storeIds: string[];
  password: string;
  passwordConfirm: string;
};

export function AccessEditorDialog({
  account,
  stores,
  busy,
  error,
  onClose,
  onSubmit,
}: {
  account: StaffAccount | null;
  stores: AdminStore[];
  busy: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (draft: StaffAccessDraft) => void;
}) {
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  const [draft, setDraft] = useState<StaffAccessDraft>({
    username: account?.username ?? "",
    displayName: account?.nickname ?? "",
    role: account?.role ?? "OPERATOR",
    storeIds: account?.stores.map((store) => store.id) ?? [],
    password: "",
    passwordConfirm: "",
  });
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const returnFocus = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const focusable = () => Array.from(dialog.querySelectorAll<HTMLElement>(
      'button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])',
    ));
    requestAnimationFrame(() => focusable()[0]?.focus());
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const controls = focusable();
      if (!controls.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    dialog.addEventListener("keydown", handleKeyDown);
    return () => {
      dialog.removeEventListener("keydown", handleKeyDown);
      returnFocus?.focus();
    };
  }, []);

  const valid =
    draft.username.trim().length >= 3 &&
    draft.displayName.trim().length > 0 &&
    (draft.role === "ADMIN" || draft.storeIds.length > 0) &&
    (account || (draft.password.length >= 12 && draft.password === draft.passwordConfirm));

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section ref={dialogRef} className="admin-record-modal access-editor" role="dialog" aria-modal="true" aria-labelledby="access-editor-title">
        <button className="modal-close" aria-label="Close access editor" onClick={onClose}>×</button>
        <span className="red-label">ADMIN ACCESS / 后台权限</span>
        <h2 id="access-editor-title">{account ? "Edit staff access" : "Create staff user"}</h2>
        <p>{account ? "Changes take effect on the next API request." : "Create a username and assign the minimum required access."}</p>

        <div className="form-split">
          <label className="form-field">
            <span>Username / 用户名</span>
            <input
              autoComplete="off"
              disabled={Boolean(account)}
              value={draft.username}
              onChange={(event) => setDraft({ ...draft, username: event.target.value.toLowerCase() })}
              placeholder="e.g. westlands-lead"
            />
          </label>
          <label className="form-field">
            <span>Display name / 显示名</span>
            <input value={draft.displayName} disabled={Boolean(account)} onChange={(event) => setDraft({ ...draft, displayName: event.target.value })} />
          </label>
        </div>

        <fieldset className="access-role-options">
          <legend>Role / 角色</legend>
          {(["ADMIN", "OPERATOR"] as const).map((role) => (
            <label key={role} className={draft.role === role ? "selected" : ""}>
              <input type="radio" name="staff-role" value={role} checked={draft.role === role} onChange={() => setDraft({ ...draft, role, storeIds: role === "ADMIN" ? [] : draft.storeIds })} />
              <strong>{role === "ADMIN" ? "Admin" : "Operator"}</strong>
              <small>{role === "ADMIN" ? "All permissions and all stores" : "Store-scoped orders and redeem; global viewers"}</small>
            </label>
          ))}
        </fieldset>

        {draft.role === "OPERATOR" && (
          <fieldset className="access-store-options">
            <legend>Store access / 门店权限</legend>
            <p>Select one or more stores. Overview, Orders and Redeem are limited to this scope.</p>
            <div>
              {stores.filter((store) => store.status !== "INACTIVE").map((store) => (
                <label key={store.id}>
                  <input
                    type="checkbox"
                    checked={draft.storeIds.includes(store.id)}
                    onChange={(event) => setDraft({
                      ...draft,
                      storeIds: event.target.checked
                        ? [...draft.storeIds, store.id]
                        : draft.storeIds.filter((id) => id !== store.id),
                    })}
                  />
                  <span><strong>{store.name}</strong><small>{store.area}</small></span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {!account && (
          <div className="form-split">
            <label className="form-field">
              <span>Password / 密码</span>
              <input type={showPassword ? "text" : "password"} autoComplete="new-password" value={draft.password} onChange={(event) => setDraft({ ...draft, password: event.target.value })} />
              <small>12+ characters with uppercase, lowercase, number and symbol.</small>
            </label>
            <label className="form-field">
              <span>Confirm password / 确认密码</span>
              <input type={showPassword ? "text" : "password"} autoComplete="new-password" value={draft.passwordConfirm} onChange={(event) => setDraft({ ...draft, passwordConfirm: event.target.value })} />
              <button type="button" className="field-text-action" onClick={() => setShowPassword(!showPassword)}>{showPassword ? "Hide passwords" : "Show passwords"}</button>
            </label>
          </div>
        )}

        {account?.status === "REMOVED" && <div className="admin-info-note">Saving restores access and starts a new access period. Previous periods remain in the audit history.</div>}
        {error && <div className="form-error" role="alert">{error}</div>}
        <div className="access-dialog-actions">
          <button onClick={onClose} disabled={busy}>Cancel</button>
          <button className="primary" disabled={!valid || busy} onClick={() => onSubmit(draft)}>
            {busy ? "Saving…" : account?.status === "REMOVED" ? "Restore access" : account ? "Save access" : "Create user"}
          </button>
        </div>
      </section>
    </div>
  );
}
