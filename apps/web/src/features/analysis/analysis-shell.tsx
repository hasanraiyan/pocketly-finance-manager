"use client";

import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { PeriodProvider, usePeriod } from "./period-context";
import type { AnalysisPeriod } from "./hooks";

const PERIOD_OPTIONS: Array<{ value: AnalysisPeriod; label: string }> = [
  { value: "7d", label: "Last 7 days" },
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "3m", label: "Last 3 months" },
  { value: "6m", label: "Last 6 months" },
  { value: "this_year", label: "This year" },
];

function PeriodSelect() {
  const { period, setPeriod } = usePeriod();
  return (
    <NativeSelect
      aria-label="Analysis period"
      value={period}
      onChange={(e) => setPeriod(e.target.value as AnalysisPeriod)}
    >
      {PERIOD_OPTIONS.map((opt) => (
        <NativeSelectOption key={opt.value} value={opt.value}>
          {opt.label}
        </NativeSelectOption>
      ))}
    </NativeSelect>
  );
}

/**
 * The page frame: heading and period selector, wrapped around the streamed
 * sections. Nothing here waits on data, so it paints with the static shell
 * while the sections are still resolving.
 *
 * `children` are Server Components rendered by the page. They sit inside
 * this provider in the rendered tree, so the client sections nested within
 * them can still read the selected period from context.
 */
export function AnalysisShell({ children }: { children: React.ReactNode }) {
  return (
    <PeriodProvider>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl text-foreground">Analysis</h1>
            <p className="text-sm text-muted-foreground">
              Cash flow and spending patterns, without the spreadsheet.
            </p>
          </div>
          <PeriodSelect />
        </div>
        {children}
      </div>
    </PeriodProvider>
  );
}
