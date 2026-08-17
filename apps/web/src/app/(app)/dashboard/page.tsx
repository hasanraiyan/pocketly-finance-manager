import { Suspense } from "react";
import { NotificationPromptBanner } from "@/features/notifications/notification-prompt-banner";
import {
  AccountsCard,
  BalanceCard,
  BudgetsCard,
  GetStartedCard,
  Greeting,
  InsightsCard,
  RecentRecords,
  Welcome,
} from "@/features/dashboard/blocks";
import {
  AccountsCardSkeleton,
  BalanceCardSkeleton,
  BudgetsCardSkeleton,
  GreetingSkeleton,
  RecentRecordsSkeleton,
} from "@/features/dashboard/skeletons";

/**
 * Deliberately not `async`: nothing is awaited at this level, so the page
 * frame and every skeleton belong to the static shell and paint at once.
 * Each block resolves its own data behind its own boundary and streams in
 * when ready, rather than all five waiting on the slowest one.
 */
export default function DashboardPage() {
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
        No fallback, deliberately. Both this and InsightsCard render nothing
        at all in the common case -- checklist finished, no insight worth
        showing -- so a skeleton would draw a card, hold the space, and then
        delete it once the data arrived. A placeholder for something that
        may not exist is worse than a slightly later appearance.
      */}
      <Suspense fallback={null}>
        <GetStartedCard />
      </Suspense>

      <Suspense fallback={<BalanceCardSkeleton />}>
        <BalanceCard />
      </Suspense>

      <Suspense fallback={null}>
        <InsightsCard />
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
