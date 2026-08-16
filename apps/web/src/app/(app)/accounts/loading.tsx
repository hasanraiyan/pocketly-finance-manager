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

export default function AccountsLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <LoadingHeading
          title="Accounts"
          description="Every bank account, wallet, and card in one place."
        />
        <ButtonBlank className="hidden md:block" />
      </div>

      <ul className="divide-y divide-border md:hidden">
        {rows(5).map((i) => (
          <li
            key={i}
            className="flex items-center justify-between gap-3 py-3"
          >
            <div className="flex min-w-0 items-center gap-3">
              <Blank className="size-9 shrink-0" />
              <div className="flex min-w-0 flex-col">
                <TextBlank className={entryWidth(i)} />
                <TextBlank size="xs" className="w-16" />
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <TextBlank className={amountWidth(i)} />
              <RowActionsBlank />
            </div>
          </li>
        ))}
      </ul>

      <Table className="hidden md:table">
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Balance</TableHead>
            <TableHead className="w-0" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows(5).map((i) => (
            <TableRow key={i}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Blank className="size-9 shrink-0" />
                  <TextBlank className={entryWidth(i)} />
                </div>
              </TableCell>
              <TableCell>
                <TextBlank className="w-16" />
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
