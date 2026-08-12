"use client";

import {
  EmailAuthProvider,
  FacebookAuthProvider,
  GoogleAuthProvider,
  applyActionCode,
  browserLocalPersistence,
  checkActionCode,
  confirmPasswordReset,
  createUserWithEmailAndPassword,
  getRedirectResult,
  linkWithCredential,
  linkWithPopup,
  onAuthStateChanged,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  unlink,
  validatePassword,
  verifyPasswordResetCode,
  type AuthCredential,
  type User,
} from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { auth, firebaseApiKey } from "./firebase";
import type { AuthMode, AuthProvider } from "./types";

let pendingLinkCredential: AuthCredential | null = null;
const persistenceReady = setPersistence(auth, browserLocalPersistence);

const providerInstance = (provider: Exclude<AuthProvider, "password">) => {
  if (provider === "google") {
    const instance = new GoogleAuthProvider();
    instance.setCustomParameters({ prompt: "select_account" });
    return instance;
  }
  const instance = new FacebookAuthProvider();
  instance.addScope("email");
  return instance;
};

const actionSettings = (returnTo = "/") => ({
  url: `${window.location.origin}${returnTo}`,
  handleCodeInApp: false,
});

export function providersFromUser(user: User): AuthProvider[] {
  return user.providerData
    .map((profile) => {
      if (profile.providerId === "google.com") return "google";
      if (profile.providerId === "facebook.com") return "facebook";
      if (profile.providerId === "password") return "password";
      return null;
    })
    .filter((provider): provider is AuthProvider => provider !== null);
}

export async function signInMember(
  kind: AuthProvider,
  mode: AuthMode,
  email = "",
  password = "",
) {
  await persistenceReady;
  if (kind !== "password") {
    const provider = providerInstance(kind);
    try {
      const result = await signInWithPopup(auth, provider);
      if (pendingLinkCredential) {
        await linkWithCredential(result.user, pendingLinkCredential);
        pendingLinkCredential = null;
      }
      return result.user;
    } catch (error) {
      if (
        error instanceof FirebaseError &&
        error.code === "auth/account-exists-with-different-credential"
      ) {
        pendingLinkCredential =
          kind === "google"
            ? GoogleAuthProvider.credentialFromError(error)
            : FacebookAuthProvider.credentialFromError(error);
      }
      if (
        error instanceof FirebaseError &&
        error.code === "auth/popup-blocked"
      ) {
        await signInWithRedirect(auth, provider);
        return null;
      }
      throw error;
    }
  }
  const user = mode === "signup"
    ? (await createUserWithEmailAndPassword(auth, email, password)).user
    : (await signInWithEmailAndPassword(auth, email, password)).user;
  if (pendingLinkCredential) {
    await linkWithCredential(user, pendingLinkCredential);
    pendingLinkCredential = null;
  }
  return user;
}

export const observeMember = (listener: (user: User | null) => void) =>
  onAuthStateChanged(auth, listener);

export const signOutMember = () => signOut(auth);

export const consumeRedirectResult = () => getRedirectResult(auth);

export const sendMemberVerification = async (returnTo = "/") => {
  if (!auth.currentUser) throw new Error("Sign in required");
  auth.languageCode = document.documentElement.lang || "en";
  await sendEmailVerification(auth.currentUser, actionSettings(returnTo));
};

export const sendMemberPasswordReset = (email: string, returnTo = "/") => {
  auth.languageCode = document.documentElement.lang || "en";
  return sendPasswordResetEmail(
    auth,
    email.trim().toLowerCase(),
    actionSettings(returnTo),
  );
};

export const validateMemberPassword = (password: string) =>
  validatePassword(auth, password);

export async function refreshMember() {
  if (!auth.currentUser) return null;
  await reload(auth.currentUser);
  await auth.currentUser.getIdToken(true);
  return auth.currentUser;
}

export async function linkMemberProvider(
  provider: Exclude<AuthProvider, "password">,
) {
  if (!auth.currentUser) throw new Error("Sign in required");
  const result = await linkWithPopup(auth.currentUser, providerInstance(provider));
  await reload(result.user);
  return result.user;
}

export async function linkMemberPassword(email: string, password: string) {
  if (!auth.currentUser) throw new Error("Sign in required");
  const idToken = await auth.currentUser.getIdToken();
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(firebaseApiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken, email, password, returnSecureToken: true }),
    },
  );
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new FirebaseError(
      "auth/credential-already-in-use",
      payload?.error?.message ?? "Could not add password sign-in",
    );
  }
  await reload(auth.currentUser);
  await auth.currentUser.getIdToken(true);
  return auth.currentUser;
}

export async function unlinkMemberProvider(provider: AuthProvider) {
  if (!auth.currentUser) throw new Error("Sign in required");
  const providers = providersFromUser(auth.currentUser);
  if (providers.length <= 1) throw new Error("LAST_PROVIDER");
  const providerId =
    provider === "google"
      ? "google.com"
      : provider === "facebook"
        ? "facebook.com"
        : EmailAuthProvider.PROVIDER_ID;
  const user = await unlink(auth.currentUser, providerId);
  await reload(user);
  return user;
}

export const inspectEmailAction = (code: string) => checkActionCode(auth, code);
export const applyEmailVerification = (code: string) => applyActionCode(auth, code);
export const inspectPasswordReset = (code: string) =>
  verifyPasswordResetCode(auth, code);
export const applyPasswordReset = (code: string, password: string) =>
  confirmPasswordReset(auth, code, password);
