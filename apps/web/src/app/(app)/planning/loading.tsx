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

export default function PlanningLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <LoadingHeading
          title="Planning"
          description="Set a budget per category and see how close you are to it."
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
                <TextBlank size="xs" className="w-20" />
              </div>
              <div className="flex gap-1">
                <Blank className="size-7" />
                <Blank className="size-7" />
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <TextBlank className="w-32" />
                <TextBlank className="w-10" />
              </div>
              {/* The empty track, drawn but not yet filled. */}
              <div className="h-1 w-full bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
