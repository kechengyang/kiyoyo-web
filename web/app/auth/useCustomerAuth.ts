"use client";

import { useCallback, useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { apiFetch } from "../platform";
import type { Lang } from "../types";
import { authErrorCode } from "./errors";
import {
  consumeRedirectResult,
  linkMemberPassword,
  linkMemberProvider,
  observeMember,
  refreshMember,
  sendMemberPasswordReset,
  sendMemberVerification,
  signInMember,
  signOutMember,
  unlinkMemberProvider,
  providersFromUser,
} from "./service";
import type { AuthPhase } from "./state";
import type {
  AuthErrorCode,
  AuthMode,
  AuthProvider,
  AuthSession,
} from "./types";

type BootstrapResponse = {
  data: { id: string; status: AuthSession["status"] };
  auth: {
    uid: string;
    emailVerified: boolean;
    providers: Array<"PASSWORD" | "GOOGLE" | "FACEBOOK">;
  };
};

export function useCustomerAuth(lang: Lang) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [ready, setReady] = useState(false);
  const [phase, setPhase] = useState<AuthPhase>("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AuthErrorCode | null>(null);

  const syncUser = useCallback(
    async (user: User | null) => {
      if (!user) {
        setSession(null);
        setPhase("signedOut");
        setReady(true);
        return null;
      }
      setPhase("loading");
      setSession((current) => (current?.uid === user.uid ? current : null));
      const payload = await apiFetch<BootstrapResponse>("/v1/auth/bootstrap", {
        method: "POST",
        body: JSON.stringify({
          nickname:
            user.displayName || user.email?.split("@")[0] || "KIYOYO Member",
          locale: lang,
        }),
      });
      const nextSession: AuthSession = {
        uid: payload.auth.uid,
        memberId: payload.data.id,
        email: user.email,
        emailVerified: payload.auth.emailVerified,
        providers: providersFromUser(user),
        status: payload.data.status,
      };
      setSession(nextSession);
      setError(null);
      setPhase("authenticated");
      setReady(true);
      return nextSession;
    },
    [lang],
  );

  useEffect(() => {
    window.localStorage.removeItem("kiyoyo-session");
    void consumeRedirectResult().catch(() => undefined);
    return observeMember((user) => {
      void syncUser(user).catch((syncError) => {
        setError(authErrorCode(syncError));
        setPhase("bootstrapError");
        setReady(true);
      });
    });
  }, [syncUser]);

  const run = useCallback(async <T,>(action: () => Promise<T>) => {
    setBusy(true);
    setError(null);
    try {
      return await action();
    } catch (actionError) {
      const code = authErrorCode(actionError);
      setError(code);
      throw code;
    } finally {
      setBusy(false);
    }
  }, []);

  const signIn = useCallback(
    (provider: AuthProvider, mode: AuthMode, email = "", password = "") =>
      run(async () => {
        const user = await signInMember(provider, mode, email, password);
        if (!user) return null;
        if (provider === "password" && mode === "signup") {
          await sendMemberVerification("/?auth=verified");
        }
        return syncUser(user);
      }),
    [run, syncUser],
  );

  const refresh = useCallback(
    () => run(async () => syncUser(await refreshMember())),
    [run, syncUser],
  );

  const refreshAfterProviderChange = useCallback(
    (action: () => Promise<User>) => run(async () => syncUser(await action())),
    [run, syncUser],
  );

  return {
    session,
    phase,
    ready,
    busy,
    error,
    clearError: () => setError(null),
    signIn,
    signOut: () => run(signOutMember),
    sendPasswordReset: (email: string) =>
      run(() => sendMemberPasswordReset(email, "/?auth=reset")),
    resendVerification: () =>
      run(() => sendMemberVerification("/?auth=verified")),
    refresh,
    linkProvider: (provider: Exclude<AuthProvider, "password">) =>
      refreshAfterProviderChange(() => linkMemberProvider(provider)),
    linkPassword: (email: string, password: string) =>
      refreshAfterProviderChange(() => linkMemberPassword(email, password)),
    unlinkProvider: (provider: AuthProvider) =>
      refreshAfterProviderChange(() => unlinkMemberProvider(provider)),
  };
}
