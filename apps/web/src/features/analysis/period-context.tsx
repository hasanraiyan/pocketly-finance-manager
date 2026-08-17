"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { DEFAULT_PERIOD } from "./constants";
import type { AnalysisPeriod } from "./hooks";

/**
 * The period selector and the sections it drives now live in separate
 * `<Suspense>` boundaries so each section can stream independently, so the
 * selection can't just be local state in a shared parent component -- it
 * rides in context instead.
 */

type PeriodContextValue = {
  period: AnalysisPeriod;
  setPeriod: (period: AnalysisPeriod) => void;
  /**
   * True while the selection still matches what the server rendered, which
   * is the only time a section may seed its query with server data.
   */
  isDefault: boolean;
};

const PeriodContext = createContext<PeriodContextValue | null>(null);

export function PeriodProvider({ children }: { children: React.ReactNode }) {
  const [period, setPeriod] = useState<AnalysisPeriod>(DEFAULT_PERIOD);

  const value = useMemo(
    () => ({ period, setPeriod, isDefault: period === DEFAULT_PERIOD }),
    [period],
  );

  return (
    <PeriodContext.Provider value={value}>{children}</PeriodContext.Provider>
  );
}

export function usePeriod() {
  const context = useContext(PeriodContext);
  if (!context) {
    throw new Error("usePeriod must be used inside a PeriodProvider");
  }
  return context;
}
