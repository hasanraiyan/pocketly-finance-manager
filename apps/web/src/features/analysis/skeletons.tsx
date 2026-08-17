import {
  Blank,
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
 * One skeleton per streamed section, shared between `loading.tsx` and each
 * section's `<Suspense>` fallback so the two hand over invisibly.
 */

const STAT_LABELS = ["Income", "Expense", "Net"];

export function StatCardsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {STAT_LABELS.map((label, i) => (
        <Card key={label}>
          <CardHeader className="pb-2">
            <CardDescription>{label}</CardDescription>
            <CardTitle>
              <TextBlank size="2xl" className={amountWidth(i)} />
            </CardTitle>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}

export function CashFlowCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Cash flow</CardTitle>
        <CardDescription>Income vs. expense over time</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Gridlines are chrome, not data, so the frame prints straight
            away and only the plotted series waits. */}
        <div className="flex h-64 w-full flex-col">
          <div className="relative flex-1">
            <div
              aria-hidden
              className="absolute inset-0 flex flex-col justify-between"
            >
              {rows(5).map((i) => (
                <div key={i} className="border-t border-border" />
              ))}
            </div>
            <Blank className="absolute inset-x-0 bottom-0 h-28" />
          </div>
          <div className="flex justify-between pt-3">
            {rows(5).map((i) => (
              <Blank key={i} className="h-2.5 w-10" />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function CategoryBreakdownSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>By category</CardTitle>
        <CardDescription>Where it&apos;s going</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {rows(5).map((i) => (
          <div key={i} className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <TextBlank className={entryWidth(i)} />
              <TextBlank className={amountWidth(i)} />
            </div>
            <div className="h-1.5 w-full bg-muted" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function AccountBreakdownSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>By account</CardTitle>
        <CardDescription>Income and expense per account</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {rows(4).map((i) => (
          <div key={i} className="flex flex-col gap-1">
            <TextBlank className={entryWidth(i)} />
            <div className="h-1.5 w-full bg-muted" />
            <div className="flex justify-between">
              <TextBlank size="xs" className="w-16" />
              <TextBlank size="xs" className="w-16" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
