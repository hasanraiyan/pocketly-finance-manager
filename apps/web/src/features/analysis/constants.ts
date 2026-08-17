import type { AnalysisPeriod } from "./hooks";

/**
 * Lives in its own module with no `"use client"` directive so the server
 * slots can read the actual value. Exports of a client module reach a
 * Server Component as client references, not plain values.
 */
export const DEFAULT_PERIOD: AnalysisPeriod = "this_month";
