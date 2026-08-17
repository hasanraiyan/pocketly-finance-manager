import {
  TextBlank,
  amountWidth,
  entryWidth,
  rows,
} from "@/components/loading-skeletons";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * One skeleton per streamed block, shared between `loading.tsx` (the
 * whole-page fallback shown while navigating) and each block's own
 * `<Suspense>` fallback. Same markup in both places, so the handover from
 * page skeleton to per-block skeleton is invisible.
 */

export function GreetingSkeleton() {
  return (
    <div>
      {/* The greeting carries the account holder's name, so it waits. */}
      <TextBlank size="2xl" className="w-40" />
      <p className="text-sm text-muted-foreground">
        Here&apos;s where things stand.
      </p>
    </div>
  );
}

/**
 * The hero slot. Its deductions vary per user, so the skeleton holds three
 * rows -- the common case -- rather than trying to guess the exact count.
 */
export function SafeToSpendCardSkeleton() {
  return (
    <Card className="overflow-hidden border-none bg-primary text-primary-foreground py-0">
      <CardContent className="flex flex-col gap-6 p-8">
        <span className="text-sm tracking-wide text-primary-foreground/70 uppercase">
          Safe to spend
        </span>
        <TextBlank
          size="hero"
          className="w-64 sm:w-80"
          barClassName="bg-primary-foreground/20"
        />
        <div className="flex flex-col gap-1 border-t border-primary-foreground/15 pt-4 font-mono text-sm">
          {["w-24", "w-32", "w-28", "w-20"].map((width, i) => (
            <div key={i} className="flex justify-between gap-4">
              <TextBlank
                className={width}
                barClassName="bg-primary-foreground/20"
              />
              <TextBlank
                className="w-20"
                barClassName="bg-primary-foreground/20"
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function BalanceCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Total balance</CardTitle>
        <CardDescription>Across every account</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <TextBlank size="2xl" className="w-48" />
        <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-border pt-4 font-mono text-sm">
          {["w-32", "w-36", "w-24"].map((width, i) => (
            <TextBlank key={i} className={width} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function ForecastCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Where this month ends</CardTitle>
        <CardDescription>
          Your repeats on their own dates, plus what you usually spend.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <TextBlank size="2xl" className="w-40" />
        <div className="flex flex-col gap-1">
          {["Coming in", "Repeats going out", "Everything else"].map(
            (label) => (
              <div key={label} className="flex justify-between gap-2">
                <span className="text-xs text-muted-foreground">{label}</span>
                <TextBlank size="xs" className="w-20" />
              </div>
            ),
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function AccountsCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Accounts</CardTitle>
        <CardDescription>
          <TextBlank size="xs" className="w-20" />
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        {rows(4).map((i) => (
          <div
            key={i}
            className="flex items-center justify-between border-l-2 border-primary py-2 pl-3"
          >
            <TextBlank className={entryWidth(i)} />
            <TextBlank className={amountWidth(i)} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function BudgetsCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Budgets</CardTitle>
        <CardDescription>This period</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {rows(4).map((i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <TextBlank className={entryWidth(i)} />
              <TextBlank className="w-10" />
            </div>
            {/* The empty track, drawn but not yet filled. */}
            <div className="h-1 w-full bg-muted" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function RecentRecordsSkeleton() {
  return (
    <Card className="py-0">
      <CardHeader className="pt-6">
        <CardTitle>Recent records</CardTitle>
      </CardHeader>
      <CardContent className="p-0 pb-2">
        <ul className="divide-y divide-border">
          {rows(6).map((i) => (
            <li key={i} className="flex items-center justify-between px-6 py-3">
              <div className="flex flex-col">
                <TextBlank className={entryWidth(i)} />
                <TextBlank size="xs" className="w-24" />
              </div>
              <TextBlank className={amountWidth(i)} />
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
