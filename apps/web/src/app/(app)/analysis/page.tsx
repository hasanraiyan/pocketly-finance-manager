import { Suspense } from "react";
import { AnalysisShell } from "@/features/analysis/analysis-shell";
import {
  AccountBreakdownSlot,
  CashFlowSlot,
  CategoryBreakdownSlot,
  StatCardsSlot,
} from "@/features/analysis/slots";
import {
  AccountBreakdownSkeleton,
  CashFlowCardSkeleton,
  CategoryBreakdownSkeleton,
  StatCardsSkeleton,
} from "@/features/analysis/skeletons";

/**
 * Deliberately not `async`: the heading and period selector belong to the
 * static shell, and each card resolves its own aggregate behind its own
 * boundary instead of all six calls blocking the page.
 */
export default function AnalysisPage() {
  return (
    <AnalysisShell>
      <Suspense fallback={<StatCardsSkeleton />}>
        <StatCardsSlot />
      </Suspense>

      <Suspense fallback={<CashFlowCardSkeleton />}>
        <CashFlowSlot />
      </Suspense>

      <div className="grid gap-4 lg:grid-cols-2">
        <Suspense fallback={<CategoryBreakdownSkeleton />}>
          <CategoryBreakdownSlot />
        </Suspense>
        <Suspense fallback={<AccountBreakdownSkeleton />}>
          <AccountBreakdownSlot />
        </Suspense>
      </div>
    </AnalysisShell>
  );
}
