export function resolveFirebaseAuthDomain({
  configuredAuthDomain,
  customAuthDomain,
  browserHostname,
}: {
  configuredAuthDomain: string;
  customAuthDomain?: string;
  browserHostname?: string;
}) {
  const customDomain = customAuthDomain?.trim().toLowerCase();
  const hostname = browserHostname?.trim().toLowerCase();

  if (
    customDomain &&
    (hostname === customDomain || hostname === `www.${customDomain}`)
  ) {
    return customDomain;
  }

  return configuredAuthDomain;
}
