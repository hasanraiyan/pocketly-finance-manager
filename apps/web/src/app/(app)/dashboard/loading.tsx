import {
  AccountsCardSkeleton,
  BalanceCardSkeleton,
  BudgetsCardSkeleton,
  ForecastCardSkeleton,
  GreetingSkeleton,
  RecentRecordsSkeleton,
  SafeToSpendCardSkeleton,
} from "@/features/dashboard/skeletons";

/**
 * Whole-page fallback while navigating here. It composes the same block
 * skeletons the page's own `<Suspense>` boundaries use, so the handover
 * from this to the streaming page is seamless.
 *
 * The blocks that may render nothing at all -- insights, health, goals --
 * are absent here for the same reason they have no per-block fallback:
 * holding space for a card that might not exist is worse than the card
 * arriving a moment later.
 */
export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-8">
      <GreetingSkeleton />
      <SafeToSpendCardSkeleton />
      <div className="grid gap-6 lg:grid-cols-2">
        <ForecastCardSkeleton />
      </div>
      <BalanceCardSkeleton />
      <div className="grid gap-6 lg:grid-cols-2">
        <AccountsCardSkeleton />
        <BudgetsCardSkeleton />
      </div>
      <RecentRecordsSkeleton />
    </div>
  );
}
