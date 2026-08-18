import type { AuthProvider } from "./types";

export function providersFromProviderData(
  providerData: Array<{ providerId: string }>,
): AuthProvider[] {
  return [
    ...new Set(
      providerData
        .map((profile) => {
          if (profile.providerId === "google.com") return "google";
          if (profile.providerId === "password") return "password";
          return null;
        })
        .filter((provider): provider is AuthProvider => provider !== null),
    ),
  ];
}
