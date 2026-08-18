import { Suspense } from "react";
import { getServerSession } from "@/lib/get-session";
import { GuestDashboardView } from "@/features/dashboard/guest-dashboard-view";
import { NotificationPromptBanner } from "@/features/notifications/notification-prompt-banner";
import {
  AccountsCard,
  BalanceCard,
  BudgetsCard,
  ForecastCard,
  GetStartedCard,
  GoalsCard,
  Greeting,
  HealthCard,
  InsightsCard,
  RecentRecords,
  SafeToSpendCard,
  Welcome,
} from "@/features/dashboard/blocks";
import {
  AccountsCardSkeleton,
  BalanceCardSkeleton,
  BudgetsCardSkeleton,
  ForecastCardSkeleton,
  GreetingSkeleton,
  RecentRecordsSkeleton,
  SafeToSpendCardSkeleton,
} from "@/features/dashboard/skeletons";

export default async function DashboardPage() {
  const session = await getServerSession();
  if (session?.isGuest) {
    return <GuestDashboardView />;
  }

  return (
    <div className="flex flex-col gap-8">
      <NotificationPromptBanner />

      {/* No skeleton: a dialog that isn't shown yet has nothing to reserve
          space for, and a placeholder would flash for returning users. */}
      <Suspense fallback={null}>
        <Welcome />
      </Suspense>

      <Suspense fallback={<GreetingSkeleton />}>
        <Greeting />
      </Suspense>

      {/*
        No fallback, deliberately. This and several blocks below render
        nothing at all in the common case -- checklist finished, no insight
        worth showing, no goals set -- so a skeleton would draw a card, hold
        the space, and then delete it once the data arrived. A placeholder
        for something that may not exist is worse than a slightly later
        appearance.
      */}
      <Suspense fallback={null}>
        <GetStartedCard />
      </Suspense>

      {/* Safe-to-spend takes the hero slot the balance used to hold. The
          balance is still below, in plain card styling -- it is a fact about
          the past, and this is the number that decides what happens next. */}
      <Suspense fallback={<SafeToSpendCardSkeleton />}>
        <SafeToSpendCard />
      </Suspense>

      <Suspense fallback={null}>
        <InsightsCard />
      </Suspense>

      {/* auto-fit (not a fixed grid-cols-2): ForecastCard and HealthCard can
          each independently render nothing, and a fixed 2-column track would
          still reserve the empty one's column -- leaving a blank half-width
          gap next to whichever card did render. auto-fit collapses to
          however many actually render, so a lone card fills the row.
          empty:hidden covers the case where BOTH render nothing: React's
          Suspense-null markers are HTML comments, not elements, so the div
          is genuinely :empty then -- without this it stays in the flex
          layout as an invisible box with the parent's gap-8 still applied
          on both sides of it, i.e. a double gap with nothing in it. */}
      <div className="grid gap-6 empty:hidden lg:grid-cols-[repeat(auto-fit,minmax(0,1fr))]">
        <Suspense fallback={<ForecastCardSkeleton />}>
          <ForecastCard />
        </Suspense>
        <Suspense fallback={null}>
          <HealthCard />
        </Suspense>
      </div>

      <Suspense fallback={null}>
        <GoalsCard />
      </Suspense>

      <Suspense fallback={<BalanceCardSkeleton />}>
        <BalanceCard />
      </Suspense>

      <div className="grid gap-6 lg:grid-cols-2">
        <Suspense fallback={<AccountsCardSkeleton />}>
          <AccountsCard />
        </Suspense>
        <Suspense fallback={<BudgetsCardSkeleton />}>
          <BudgetsCard />
        </Suspense>
      </div>

      <Suspense fallback={<RecentRecordsSkeleton />}>
        <RecentRecords />
      </Suspense>
    </div>
  );
}
