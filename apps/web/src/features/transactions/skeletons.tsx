import {
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

/**
 * The record rows, blank. Shared between `loading.tsx` and the view itself,
 * which shows this while a newly typed search or filter is still loading
 * and there are no previous results to hold on screen.
 */
export function RecordRowsSkeleton() {
  return (
    <>
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
    </>
  );
}
