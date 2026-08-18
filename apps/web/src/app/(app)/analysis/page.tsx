import { Suspense } from "react";
import { getServerSession } from "@/lib/get-session";
import { GuestAnalysisView } from "@/features/analysis/guest-analysis-view";
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

export default async function AnalysisPage() {
  const session = await getServerSession();
  if (session?.isGuest) {
    return <GuestAnalysisView />;
  }

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
