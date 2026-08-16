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

/** Blanks sitting on the green balance card need to read light, not muted. */
function CardBlank({ className }: { className?: string }) {
  return (
    <TextBlank
      size="sm"
      className={className}
      barClassName="bg-primary-foreground/20"
    />
  );
}

export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        {/* The greeting carries the account holder's name, so it waits. */}
        <TextBlank size="2xl" className="w-40" />
        <p className="text-sm text-muted-foreground">
          Here&apos;s where things stand.
        </p>
      </div>

      <Card className="overflow-hidden border-none bg-primary text-primary-foreground py-0">
        <CardContent className="flex flex-col gap-6 p-8">
          <span className="text-sm tracking-wide text-primary-foreground/70 uppercase">
            Total balance
          </span>
          <TextBlank
            size="hero"
            className="w-64 sm:w-80"
            barClassName="bg-primary-foreground/20"
          />
          <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-primary-foreground/15 pt-4 font-mono text-sm">
            <CardBlank className="w-32" />
            <CardBlank className="w-36" />
            <CardBlank className="w-24" />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
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
      </div>

      <Card className="py-0">
        <CardHeader className="pt-6">
          <CardTitle>Recent records</CardTitle>
        </CardHeader>
        <CardContent className="p-0 pb-2">
          <ul className="divide-y divide-border">
            {rows(6).map((i) => (
              <li
                key={i}
                className="flex items-center justify-between px-6 py-3"
              >
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
    </div>
  );
}
