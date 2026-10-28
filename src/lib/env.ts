/**
 * Validated environment variables.
 * App fails to start if required production secrets are missing.
 */

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    if (process.env.APP_ENV === "production") {
      throw new Error(
        `[env] Missing required environment variable: ${key}. ` +
          "Application cannot start without all production secrets configured."
      );
    }
    console.warn(`[env] Warning: ${key} is not set (non-production mode)`);
    return "";
  }
  return value;
}

function optionalEnv(key: string, defaultValue = ""): string {
  return process.env[key] ?? defaultValue;
}

export const env = {
  DATABASE_URL: requireEnv("DATABASE_URL"),
  NEXTAUTH_SECRET: requireEnv("NEXTAUTH_SECRET"),
  NEXTAUTH_URL: optionalEnv("NEXTAUTH_URL", "http://localhost:3000"),
  APP_URL: optionalEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000"),
  APP_ENV: optionalEnv("APP_ENV", "development"),

  // Email
  SMTP_HOST: optionalEnv("SMTP_HOST"),
  SMTP_PORT: parseInt(optionalEnv("SMTP_PORT", "587"), 10),
  SMTP_SECURE: optionalEnv("SMTP_SECURE", "false") === "true",
  SMTP_USER: optionalEnv("SMTP_USER"),
  SMTP_PASSWORD: optionalEnv("SMTP_PASSWORD"),
  EMAIL_FROM: optionalEnv("EMAIL_FROM", "FD Portal <no-reply@localhost>"),

  // Storage
  UPLOAD_DIR: optionalEnv("UPLOAD_DIR", "./uploads"),
  UPLOAD_MAX_SIZE_MB: parseInt(optionalEnv("UPLOAD_MAX_SIZE_MB", "20"), 10),

  // Rate limiting
  RATE_LIMIT_LOGIN_MAX: parseInt(optionalEnv("RATE_LIMIT_LOGIN_MAX", "10"), 10),
  RATE_LIMIT_LOGIN_WINDOW_SECONDS: parseInt(
    optionalEnv("RATE_LIMIT_LOGIN_WINDOW_SECONDS", "900"),
    10
  ),
  RATE_LIMIT_REGISTER_MAX: parseInt(optionalEnv("RATE_LIMIT_REGISTER_MAX", "5"), 10),
  RATE_LIMIT_REGISTER_WINDOW_SECONDS: parseInt(
    optionalEnv("RATE_LIMIT_REGISTER_WINDOW_SECONDS", "3600"),
    10
  ),
  RATE_LIMIT_KYC_MAX: parseInt(optionalEnv("RATE_LIMIT_KYC_MAX", "10"), 10),
  RATE_LIMIT_KYC_WINDOW_SECONDS: parseInt(
    optionalEnv("RATE_LIMIT_KYC_WINDOW_SECONDS", "3600"),
    10
  ),
  RATE_LIMIT_EXPORT_MAX: parseInt(optionalEnv("RATE_LIMIT_EXPORT_MAX", "5"), 10),
  RATE_LIMIT_EXPORT_WINDOW_SECONDS: parseInt(
    optionalEnv("RATE_LIMIT_EXPORT_WINDOW_SECONDS", "3600"),
    10
  ),

  // MFA
  MFA_ISSUER: optionalEnv("MFA_ISSUER", "FD Portal"),
  MFA_ENCRYPTION_KEY: optionalEnv("MFA_ENCRYPTION_KEY"),

  // Jobs
  REMINDER_CRON: optionalEnv("REMINDER_CRON", "0 6 * * *"),

  // CORS / CSRF — always include the app's own origin so same-site fetches work
  // even when ALLOWED_ORIGINS isn't explicitly set (e.g. Vercel cold deploys)
  ALLOWED_ORIGINS: (() => {
    const explicit = optionalEnv("ALLOWED_ORIGINS", "")
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean);
    const appUrls = [
      optionalEnv("NEXTAUTH_URL", ""),
      optionalEnv("NEXT_PUBLIC_APP_URL", ""),
    ]
      .map((u) => {
        try {
          return new URL(u).origin;
        } catch {
          return "";
        }
      })
      .filter(Boolean);
    const defaults = ["http://localhost:3000"];
    return [...new Set([...explicit, ...appUrls, ...defaults])];
  })(),

  // Proxy: when set, X-Forwarded-For is trusted for IP extraction
  TRUSTED_PROXY: optionalEnv("TRUSTED_PROXY"),

  isProduction: () => optionalEnv("APP_ENV", "development") === "production",
  isDevelopment: () => optionalEnv("APP_ENV", "development") === "development",
};
