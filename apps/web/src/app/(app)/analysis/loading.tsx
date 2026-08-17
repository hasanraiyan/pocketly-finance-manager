import { Blank, LoadingHeading } from "@/components/loading-skeletons";
import {
  AccountBreakdownSkeleton,
  CashFlowCardSkeleton,
  CategoryBreakdownSkeleton,
  StatCardsSkeleton,
} from "@/features/analysis/skeletons";

/**
 * Whole-page fallback while navigating here. Composes the same section
 * skeletons the page's own `<Suspense>` boundaries use, so the handover to
 * the streaming page is seamless.
 */
export default function AnalysisLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <LoadingHeading
          title="Analysis"
          description="Cash flow and spending patterns, without the spreadsheet."
        />
        <Blank className="h-9 w-36 md:h-8" />
      </div>

      <StatCardsSkeleton />
      <CashFlowCardSkeleton />
      <div className="grid gap-4 lg:grid-cols-2">
        <CategoryBreakdownSkeleton />
        <AccountBreakdownSkeleton />
      </div>
    </div>
  );
}
