const required = (name: string, fallback?: string) => {
  const value = process.env[name] ?? fallback;
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
};

const environment = process.env.APP_ENV ?? "dev";
const databaseSuffix = environment.replaceAll("-", "_");
const resourcePrefix = `kiyoyo-${environment}`;
const developmentDefault = (value: string) =>
  environment === "dev" ? value : undefined;

export const config = {
  port: Number(process.env.PORT ?? 8080),
  host: "0.0.0.0",
  projectId: required("GOOGLE_CLOUD_PROJECT", "kiyoyo"),
  environment,
  db: {
    host: required("DB_HOST", developmentDefault("127.0.0.1")),
    port: Number(process.env.DB_PORT ?? 5432),
    database: required("DB_NAME", `kiyoyo_${databaseSuffix}`),
    user: required("DB_USER", `kiyoyo_${databaseSuffix}_api`),
    password: required("DB_PASSWORD"),
    max: Number(process.env.DB_POOL_MAX ?? 5),
  },
  mediaBucket: required("MEDIA_BUCKET", `${resourcePrefix}-media`),
  pickupSigningKey: required("PICKUP_SIGNING_KEY"),
  allowedOrigins: (process.env.ALLOWED_ORIGINS ??
    [
      ...(environment === "dev" ? ["http://localhost:3000"] : []),
      `https://${resourcePrefix}.web.app`,
      `https://${resourcePrefix}.firebaseapp.com`,
    ].join(","))
    .split(",")
    .map((value) => value.trim()),
  adminEmails: new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  ),
};
