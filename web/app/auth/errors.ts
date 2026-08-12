export const authErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Sign in failed";
