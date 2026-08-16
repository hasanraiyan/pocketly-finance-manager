import * as Sentry from "@sentry/nextjs";

// Runs once per server runtime (node + edge) before the app handles requests.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" || process.env.NEXT_RUNTIME === "edge") {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV ?? "development",
      // Financial data must never leave the app as telemetry -- mirrors
      // apps/api's instrument.ts.
      sendDefaultPii: false,
    });
  }
}

export const onRequestError = Sentry.captureRequestError;
