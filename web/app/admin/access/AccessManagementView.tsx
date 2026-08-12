import { useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "../../platform";
import type { AdminSession, AdminStore, StaffAccount } from "../core/types";
import { AccessEditorDialog, type StaffAccessDraft } from "./AccessEditorDialog";

type SensitiveAction = { kind: "remove" | "password"; account: StaffAccount } | null;

export function AccessManagementView({ session, stores }: { session: AdminSession; stores: AdminStore[] }) {
  const [accounts, setAccounts] = useState<StaffAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | "ADMIN" | "OPERATOR">("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "REMOVED">("ALL");
  const [editing, setEditing] = useState<StaffAccount | "new" | null>(null);
  const [action, setAction] = useState<SensitiveAction>(null);
  const [reason, setReason] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const actionDialogRef = useRef<HTMLElement>(null);
  const actionReturnFocusRef = useRef<HTMLElement | null>(null);
  const actionOpen = Boolean(action);

  useEffect(() => {
    if (!actionOpen) return;
    actionReturnFocusRef.current = document.activeElement as HTMLElement | null;
    const dialog = actionDialogRef.current;
    if (!dialog) return;
    const focusable = () => Array.from(dialog.querySelectorAll<HTMLElement>(
      'button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])',
    ));
    requestAnimationFrame(() => focusable()[0]?.focus());
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setAction(null);
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
      actionReturnFocusRef.current?.focus();
      actionReturnFocusRef.current = null;
    };
  }, [actionOpen]);

  const loadAccounts = async () => {
    setLoading(true);
    setError("");
    try {
      const payload = await apiFetch<{ data: StaffAccount[] }>("/v1/admin/access/users");
      setAccounts(payload.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Staff access could not be loaded");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    apiFetch<{ data: StaffAccount[] }>("/v1/admin/access/users")
      .then((payload) => { if (active) setAccounts(payload.data); })
      .catch((loadError: unknown) => { if (active) setError(loadError instanceof Error ? loadError.message : "Staff access could not be loaded"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const shown = useMemo(() => {
    const term = search.trim().toLowerCase();
    return accounts.filter((account) =>
      (!term || account.username.toLowerCase().includes(term) || account.nickname.toLowerCase().includes(term)) &&
      (roleFilter === "ALL" || account.role === roleFilter) &&
      (statusFilter === "ALL" || account.status === statusFilter),
    );
  }, [accounts, roleFilter, search, statusFilter]);

  const saveAccess = async (draft: StaffAccessDraft) => {
    setBusy(true);
    setError("");
    try {
      if (editing === "new") {
        await apiFetch("/v1/admin/access/users", {
          method: "POST",
          body: JSON.stringify({
            username: draft.username,
            display_name: draft.displayName,
            role: draft.role,
            store_ids: draft.storeIds,
            password: draft.password,
            password_confirm: draft.passwordConfirm,
          }),
        });
      } else if (editing) {
        await apiFetch(`/v1/admin/access/users/${editing.user_id}`, {
          method: "PATCH",
          body: JSON.stringify({ role: draft.role, store_ids: draft.storeIds, restore: editing.status === "REMOVED" }),
        });
      }
      setEditing(null);
      await loadAccounts();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Access could not be saved");
    } finally {
      setBusy(false);
    }
  };

  const runSensitiveAction = async () => {
    if (!action) return;
    setBusy(true);
    setError("");
    try {
      if (action.kind === "remove") {
        await apiFetch(`/v1/admin/access/users/${action.account.user_id}`, {
          method: "DELETE",
          body: JSON.stringify({ reason }),
        });
      } else {
        await apiFetch(`/v1/admin/users/${action.account.user_id}/password`, {
          method: "POST",
          body: JSON.stringify({ password, password_confirm: passwordConfirm, reason }),
        });
      }
      setAction(null);
      setReason("");
      setPassword("");
      setPasswordConfirm("");
      await loadAccounts();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "The action could not be completed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="admin-panel wide access-management">
      <div className="product-admin-head">
        <div><span className="red-label">SECURITY / 权限</span><h2>Admin access</h2><p>Create staff users, assign roles and preserve every access period.</p></div>
        <button className="new-product" onClick={() => { setError(""); setEditing("new"); }}>+ New user</button>
      </div>
      <div className="access-tools">
        <label><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search username or name" /></label>
        <select aria-label="Filter by role" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as typeof roleFilter)}><option value="ALL">All roles</option><option value="ADMIN">Admin</option><option value="OPERATOR">Operator</option></select>
        <select aria-label="Filter by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}><option value="ALL">All states</option><option value="ACTIVE">Active</option><option value="REMOVED">Access removed</option></select>
      </div>
      {error && <div className="form-error" role="alert">{error}</div>}
      {loading ? <div className="admin-empty-state"><strong>Loading staff access…</strong></div> : shown.length ? (
        <div className="access-table">
          <div className="access-table-head"><span>User</span><span>Role</span><span>Store access</span><span>Access period</span><span>Actions</span></div>
          {shown.map((account) => (
            <article key={account.user_id} className={account.status === "REMOVED" ? "removed" : ""}>
              <span className="access-user"><i>{account.username.slice(0, 2).toUpperCase()}</i><b>{account.nickname}<small>@{account.username}</small></b></span>
              <span><em className="access-role" data-role={account.role.toLowerCase()}>{account.role}</em><small>{account.status === "ACTIVE" ? "Active" : "Access removed"}</small></span>
              <span className="access-store-chips">{account.role === "ADMIN" ? <b>All stores</b> : account.stores.map((store) => <small key={store.id}>{store.area}</small>)}</span>
              <span><b>{new Date(account.access_started_at).toLocaleDateString("en-KE")}</b><small>{account.access_ended_at ? `Ended ${new Date(account.access_ended_at).toLocaleDateString("en-KE")}` : "Current period"}</small></span>
              <span className="access-row-actions">
                <button onClick={() => { setError(""); setEditing(account); }}>{account.status === "REMOVED" ? "Restore" : "Edit"}</button>
                {account.status === "ACTIVE" && <button onClick={() => { setError(""); setAction({ kind: "password", account }); }}>Set password</button>}
                {account.status === "ACTIVE" && account.user_id !== session.user_id && <button className="danger-text" onClick={() => { setError(""); setAction({ kind: "remove", account }); }}>Remove access</button>}
              </span>
            </article>
          ))}
        </div>
      ) : <div className="admin-empty-state"><strong>No staff users match these filters</strong><span>Clear filters or create a new user.</span></div>}

      {editing && <AccessEditorDialog account={editing === "new" ? null : editing} stores={stores} busy={busy} error={error} onClose={() => setEditing(null)} onSubmit={(draft) => void saveAccess(draft)} />}
      {action && (
        <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setAction(null)}>
          <section ref={actionDialogRef} className="admin-record-modal access-action-dialog" role="dialog" aria-modal="true" aria-labelledby="access-action-title">
            <button className="modal-close" aria-label="Close" onClick={() => setAction(null)}>×</button>
            <span className="red-label">{action.kind === "remove" ? "REMOVE ACCESS / 移除权限" : "SET PASSWORD / 设置密码"}</span>
            <h2 id="access-action-title">{action.account.nickname}</h2><p>@{action.account.username}</p>
            {action.kind === "password" && <div className="form-split"><label className="form-field"><span>New password / 新密码</span><input type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label><label className="form-field"><span>Confirm password / 确认密码</span><input type="password" autoComplete="new-password" value={passwordConfirm} onChange={(event) => setPasswordConfirm(event.target.value)} /></label></div>}
            <label className="form-field"><span>Reason / 原因</span><textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Required for the audit log" /></label>
            {action.kind === "remove" && <div className="admin-info-note">Access ends immediately. The account, access periods and audit history remain available.</div>}
            {error && <div className="form-error" role="alert">{error}</div>}
            <div className="access-dialog-actions"><button onClick={() => setAction(null)} disabled={busy}>Cancel</button><button className={action.kind === "remove" ? "danger" : "primary"} disabled={busy || reason.trim().length < 3 || (action.kind === "password" && (password.length < 12 || password !== passwordConfirm))} onClick={() => void runSensitiveAction()}>{busy ? "Working…" : action.kind === "remove" ? "Remove access" : "Set password"}</button></div>
          </section>
        </div>
      )}
    </section>
  );
}
