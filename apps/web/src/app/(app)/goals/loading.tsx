import {
  Blank,
  ButtonBlank,
  LoadingHeading,
  TextBlank,
  entryWidth,
  rows,
} from "@/components/loading-skeletons";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function GoalsLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <LoadingHeading
          title="Goals"
          description="What you're saving towards, and when you'll get there."
        />
        <ButtonBlank className="hidden md:block" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows(6).map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-start justify-between gap-2">
              <div>
                <CardTitle>
                  <TextBlank size="base" className={entryWidth(i)} />
                </CardTitle>
                {/* The status badge footprint, held open. */}
                <Blank className="mt-1 h-5 w-16" />
              </div>
              <div className="flex gap-1">
                <Blank className="size-7" />
                <Blank className="size-7" />
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between">
                  <TextBlank className="w-24" />
                  <TextBlank className="w-20" />
                </div>
                {/* The empty track, drawn but not yet filled. */}
                <div className="h-1 w-full bg-muted" />
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">
                    Expected
                  </span>
                  <TextBlank size="xs" className="w-20" />
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">
                    Each month
                  </span>
                  <TextBlank size="xs" className="w-16" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
