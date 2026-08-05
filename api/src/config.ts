const required = (name: string, fallback?: string) => {
  const value = process.env[name] ?? fallback;
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
};

export const config = {
  port: Number(process.env.PORT ?? 8080),
  host: "0.0.0.0",
  projectId: required("GOOGLE_CLOUD_PROJECT", "kiyoyo"),
  environment: process.env.APP_ENV ?? "dev",
  db: {
    host: required("DB_HOST", "127.0.0.1"),
    port: Number(process.env.DB_PORT ?? 5432),
    database: required("DB_NAME", "kiyoyo_dev"),
    user: required("DB_USER", "kiyoyo_dev_api"),
    password: required("DB_PASSWORD"),
    max: Number(process.env.DB_POOL_MAX ?? 5),
  },
  mediaBucket: required("MEDIA_BUCKET", "kiyoyo-dev-media"),
  pickupSigningKey: required("PICKUP_SIGNING_KEY"),
  allowedOrigins: (process.env.ALLOWED_ORIGINS ?? "http://localhost:3000,https://kiyoyo-dev.web.app,https://kiyoyo-dev.firebaseapp.com")
    .split(",")
    .map((value) => value.trim()),
  adminEmails: new Set(
    (process.env.ADMIN_EMAILS ?? "kechengyang234@gmail.com")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  ),
};
