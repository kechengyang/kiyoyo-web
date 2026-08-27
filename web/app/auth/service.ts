"use client";

import {
  EmailAuthProvider,
  GoogleAuthProvider,
  RecaptchaVerifier,
  applyActionCode,
  browserLocalPersistence,
  checkActionCode,
  confirmPasswordReset,
  createUserWithEmailAndPassword,
  getRedirectResult,
  linkWithPopup,
  linkWithPhoneNumber,
  onAuthStateChanged,
  reload,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  unlink,
  validatePassword,
  verifyPasswordResetCode,
  type User,
} from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { auth, firebaseApiKey } from "./firebase";
import { identityToolkitFirebaseCode } from "./identityToolkitErrors";
import { providersFromProviderData } from "./providers";
import type { AuthMode, AuthProvider } from "./types";

const persistenceReady = setPersistence(auth, browserLocalPersistence);

const googleProvider = () => {
  const instance = new GoogleAuthProvider();
  instance.setCustomParameters({ prompt: "select_account" });
  return instance;
};

const actionSettings = (returnTo = "/") => ({
  url: `${window.location.origin}${returnTo}`,
  handleCodeInApp: false,
});

export function providersFromUser(user: User): AuthProvider[] {
  return providersFromProviderData(user.providerData);
}

export async function signInMember(
  kind: AuthProvider,
  mode: AuthMode,
  email = "",
  password = "",
) {
  await persistenceReady;
  if (kind !== "password") {
    const provider = googleProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      return result.user;
    } catch (error) {
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
  return user;
}

export const observeMember = (listener: (user: User | null) => void) =>
  onAuthStateChanged(auth, listener);

export const signOutMember = () => signOut(auth);

export const staffIdentityAlias = (username: string) =>
  `${username.trim().toLowerCase()}@staff.kiyoyo.internal`;

export async function signInStaff(username: string, password: string) {
  const login = username.trim().toLowerCase();
  const identity = login.includes("@") ? login : staffIdentityAlias(login);
  return (await signInWithEmailAndPassword(auth, identity, password)).user;
}

export const consumeRedirectResult = () => getRedirectResult(auth);

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

export async function linkMemberProvider() {
  if (!auth.currentUser) throw new Error("Sign in required");
  const result = await linkWithPopup(auth.currentUser, googleProvider());
  await reload(result.user);
  return result.user;
}

export async function linkMemberPassword(email: string, password: string) {
  if (!auth.currentUser) throw new Error("Sign in required");
  const idToken = await auth.currentUser.getIdToken();
  let response: Response;
  try {
    response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(firebaseApiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken,
          email,
          password,
          returnSecureToken: true,
        }),
      },
    );
  } catch (error) {
    throw new FirebaseError(
      "auth/network-request-failed",
      error instanceof Error ? error.message : "Could not reach sign-in service",
    );
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new FirebaseError(
      identityToolkitFirebaseCode(payload?.error?.message),
      payload?.error?.message ?? "Could not add password sign-in",
    );
  }
  await reload(auth.currentUser);
  await auth.currentUser.getIdToken(true);
  return auth.currentUser;
}

export type MemberPhoneChallenge = {
  confirm: (code: string) => Promise<User>;
  clear: () => void;
};

export async function beginMemberPhoneVerification(
  phoneNumber: string,
  recaptchaContainer: HTMLElement,
): Promise<MemberPhoneChallenge> {
  if (!auth.currentUser) throw new Error("Sign in required");
  auth.languageCode = document.documentElement.lang || "en";
  const verifier = new RecaptchaVerifier(auth, recaptchaContainer, {
    size: "invisible",
  });
  try {
    await verifier.render();
    const confirmation = await linkWithPhoneNumber(
      auth.currentUser,
      phoneNumber,
      verifier,
    );
    return {
      clear: () => verifier.clear(),
      confirm: async (code: string) => {
        try {
          const result = await confirmation.confirm(code);
          await reload(result.user);
          await result.user.getIdToken(true);
          return result.user;
        } catch (error) {
          if (
            error instanceof FirebaseError &&
            error.code === "auth/credential-already-in-use"
          ) {
            throw new FirebaseError(
              "auth/phone-number-already-exists",
              "This phone number is already linked to another account",
            );
          }
          throw error;
        }
      },
    };
  } catch (error) {
    verifier.clear();
    if (
      error instanceof FirebaseError &&
      error.code === "auth/credential-already-in-use"
    ) {
      throw new FirebaseError(
        "auth/phone-number-already-exists",
        "This phone number is already linked to another account",
      );
    }
    throw error;
  }
}

export async function unlinkMemberProvider(provider: AuthProvider) {
  if (!auth.currentUser) throw new Error("Sign in required");
  const providers = providersFromUser(auth.currentUser);
  if (providers.length <= 1) throw new Error("LAST_PROVIDER");
  const providerId =
    provider === "google" ? "google.com" : EmailAuthProvider.PROVIDER_ID;
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
