"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { User } from "firebase/auth";
import { apiFetch } from "../platform";
import type { Lang } from "../types";
import { authErrorCode } from "./errors";
import {
  consumeRedirectResult,
  beginMemberPhoneVerification,
  linkMemberPassword,
  linkMemberProvider,
  observeMember,
  refreshMember,
  sendMemberPasswordReset,
  signInMember,
  signOutMember,
  unlinkMemberProvider,
  providersFromUser,
  type MemberPhoneChallenge,
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
    phoneNumber: string | null;
    phoneVerified: boolean;
    membershipReady: boolean;
    providers: Array<"PASSWORD" | "GOOGLE">;
  };
};

export function useCustomerAuth(lang: Lang) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [ready, setReady] = useState(false);
  const [phase, setPhase] = useState<AuthPhase>("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AuthErrorCode | null>(null);
  const phoneChallenge = useRef<MemberPhoneChallenge | null>(null);

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
        phoneNumber: payload.auth.phoneNumber,
        phoneVerified: payload.auth.phoneVerified,
        membershipReady: payload.auth.membershipReady,
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

  const resetPhoneVerification = useCallback(() => {
    phoneChallenge.current?.clear();
    phoneChallenge.current = null;
  }, []);

  useEffect(() => () => resetPhoneVerification(), [resetPhoneVerification]);

  const sendPhoneCode = useCallback(
    (phoneNumber: string, recaptchaContainer: HTMLElement) =>
      run(async () => {
        resetPhoneVerification();
        phoneChallenge.current = await beginMemberPhoneVerification(
          phoneNumber,
          recaptchaContainer,
        );
      }),
    [resetPhoneVerification, run],
  );

  const confirmPhoneCode = useCallback(
    (code: string) =>
      run(async () => {
        if (!phoneChallenge.current) throw new Error("PHONE_CHALLENGE_REQUIRED");
        const user = await phoneChallenge.current.confirm(code);
        resetPhoneVerification();
        return syncUser(user);
      }),
    [resetPhoneVerification, run, syncUser],
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
    refresh,
    sendPhoneCode,
    confirmPhoneCode,
    resetPhoneVerification,
    linkProvider: () =>
      refreshAfterProviderChange(() => linkMemberProvider()),
    linkPassword: (email: string, password: string) =>
      refreshAfterProviderChange(() => linkMemberPassword(email, password)),
    unlinkProvider: (provider: AuthProvider) =>
      refreshAfterProviderChange(() => unlinkMemberProvider(provider)),
  };
}
