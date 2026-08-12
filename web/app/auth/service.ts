"use client";

import {
  FacebookAuthProvider,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { auth } from "./firebase";
import type { AuthMode, AuthProvider } from "./types";

export async function signInMember(
  kind: AuthProvider,
  mode: AuthMode,
  email = "",
  password = "",
) {
  if (kind === "google") {
    return (await signInWithPopup(auth, new GoogleAuthProvider())).user;
  }
  if (kind === "facebook") {
    return (await signInWithPopup(auth, new FacebookAuthProvider())).user;
  }
  return mode === "signup"
    ? (await createUserWithEmailAndPassword(auth, email, password)).user
    : (await signInWithEmailAndPassword(auth, email, password)).user;
}

export const observeMember = (listener: (user: User | null) => void) =>
  onAuthStateChanged(auth, listener);

export const signOutMember = () => signOut(auth);

export const sendMemberVerification = async () => {
  if (!auth.currentUser) throw new Error("Sign in required");
  await sendEmailVerification(auth.currentUser);
};

export const sendMemberPasswordReset = (email: string) =>
  sendPasswordResetEmail(auth, email.trim().toLowerCase());
