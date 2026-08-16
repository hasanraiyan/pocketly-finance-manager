import {
  Blank,
  LoadingHeading,
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

const STAT_LABELS = ["Income", "Expense", "Net"];

/**
 * The gridlines are chrome, not data, so the chart frame prints straight
 * away and only the plotted series waits.
 */
function ChartFrameSkeleton() {
  return (
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
  );
}

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

      <Card>
        <CardHeader>
          <CardTitle>Cash flow</CardTitle>
          <CardDescription>Income vs. expense over time</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartFrameSkeleton />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
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
      </div>
    </div>
  );
}
