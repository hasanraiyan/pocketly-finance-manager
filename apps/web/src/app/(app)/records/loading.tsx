import {
  Blank,
  ButtonBlank,
  LoadingHeading,
  RowActionsBlank,
  TextBlank,
  amountWidth,
  entryWidth,
  rows,
} from "@/components/loading-skeletons";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
          {["w-12", "w-20", "w-18", "w-20"].map((width) => (
            <Blank key={width} className={`h-8 rounded-full ${width}`} />
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

      <ul className="divide-y divide-border md:hidden">
        {rows(6).map((i) => (
          <li key={i} className="flex flex-col gap-1.5 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-col">
                <TextBlank className={entryWidth(i)} />
                <TextBlank size="xs" className="w-24" />
              </div>
              <TextBlank className={`shrink-0 ${amountWidth(i)}`} />
            </div>
            <div className="flex items-center justify-between gap-2">
              <TextBlank size="xs" className="w-20" />
              <RowActionsBlank />
            </div>
          </li>
        ))}
      </ul>

      <Table className="hidden md:table">
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Account</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="w-0" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows(6).map((i) => (
            <TableRow key={i}>
              <TableCell>
                <TextBlank className="w-24" />
              </TableCell>
              <TableCell>
                <TextBlank className={entryWidth(i)} />
              </TableCell>
              <TableCell>
                <TextBlank className="w-28" />
              </TableCell>
              <TableCell>
                <TextBlank className={`ml-auto ${amountWidth(i)}`} />
              </TableCell>
              <TableCell>
                <RowActionsBlank />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
