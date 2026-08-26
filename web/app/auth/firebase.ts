"use client";

import { getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { resolveFirebaseAuthDomain } from "./domain";

const deploymentEnvironment = process.env.NEXT_PUBLIC_KIYOYO_ENV ?? "dev";
const devFallback = deploymentEnvironment === "dev";

const publicConfigValue = (
  name: string,
  configured: string | undefined,
  developmentDefault: string,
) => {
  const value = configured ?? (devFallback ? developmentDefault : undefined);
  if (!value) {
    throw new Error(
      `Missing ${name} for the ${deploymentEnvironment} web build`,
    );
  }
  return value;
};

const configuredAuthDomain = publicConfigValue(
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  "kiyoyo.firebaseapp.com",
);
const customAuthDomain =
  process.env.NEXT_PUBLIC_FIREBASE_CUSTOM_AUTH_DOMAIN ??
  (devFallback ? "kiyoyo.africa" : undefined);

const firebaseConfig = {
  projectId: publicConfigValue(
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    "kiyoyo",
  ),
  appId: publicConfigValue(
    "NEXT_PUBLIC_FIREBASE_APP_ID",
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    "1:386290495601:web:47a307bc4965ddca752bd0",
  ),
  storageBucket: publicConfigValue(
    "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    "kiyoyo.firebasestorage.app",
  ),
  apiKey: publicConfigValue(
    "NEXT_PUBLIC_FIREBASE_API_KEY",
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    "AIzaSyCpM9bXRBrObsN4u5_cUq0kragkI0fCdNI",
  ),
  authDomain: resolveFirebaseAuthDomain({
    configuredAuthDomain,
    customAuthDomain,
    browserHostname:
      typeof window === "undefined" ? undefined : window.location.hostname,
  }),
  messagingSenderId: publicConfigValue(
    "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    "386290495601",
  ),
};

const firebaseApp = getApps()[0] ?? initializeApp(firebaseConfig);

export const auth = getAuth(firebaseApp);
export const firebaseApiKey = firebaseConfig.apiKey;
