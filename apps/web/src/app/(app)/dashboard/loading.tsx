import {
  AccountsCardSkeleton,
  BalanceCardSkeleton,
  BudgetsCardSkeleton,
  GreetingSkeleton,
  RecentRecordsSkeleton,
} from "@/features/dashboard/skeletons";

/**
 * Whole-page fallback while navigating here. It composes the same block
 * skeletons the page's own `<Suspense>` boundaries use, so the handover
 * from this to the streaming page is seamless.
 */
export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-8">
      <GreetingSkeleton />
      <BalanceCardSkeleton />
      <div className="grid gap-6 lg:grid-cols-2">
        <AccountsCardSkeleton />
        <BudgetsCardSkeleton />
      </div>
      <RecentRecordsSkeleton />
    </div>
  );
}
