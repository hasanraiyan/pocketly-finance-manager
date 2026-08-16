import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV ?? "development",
  // Financial data must never leave the app as telemetry -- mirrors
  // apps/api's instrument.ts.
  sendDefaultPii: false,
});
