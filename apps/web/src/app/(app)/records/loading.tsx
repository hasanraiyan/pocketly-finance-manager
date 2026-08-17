import {
  Blank,
  ButtonBlank,
  LoadingHeading,
} from "@/components/loading-skeletons";
import { RecordRowsSkeleton } from "@/features/transactions/skeletons";

export default function RecordsLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <LoadingHeading
          title="Records"
          description="Every income, expense, and transfer you've logged."
        />
        <div className="hidden items-center gap-2 md:flex">
          <ButtonBlank />
          <ButtonBlank />
        </div>
      </div>

      <div className="hidden items-center justify-between gap-3 md:flex">
        <div className="flex gap-2">
          {/* All, Expense, Income, Transfer */}
          {["w-12", "w-20", "w-18", "w-20"].map((width, i) => (
            <Blank key={i} className={`h-8 rounded-full ${width}`} />
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Blank className="h-9 w-36 md:h-8" />
          <Blank className="h-9 w-48 md:h-8" />
        </div>
      </div>

      <div className="flex items-center gap-2 md:hidden">
        <Blank className="h-9 flex-1" />
        <Blank className="size-9 shrink-0" />
      </div>

      <RecordRowsSkeleton />
    </div>
  );
}
