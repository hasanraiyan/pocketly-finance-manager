"use client";

import { useState } from "react";
import { PenLine, Plus, Trash2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { AccountFormDialog } from "./account-form-dialog";
import { useAccounts, useDeleteAccount, type Account } from "./hooks";

const ACCOUNT_TYPE_LABELS: Record<Account["type"], string> = {
  bank: "Bank",
  cash: "Cash",
  savings: "Savings",
  upi: "UPI",
  credit_card: "Credit card",
  wallet: "Wallet",
};

function DeleteAccountAlert({ account }: { account: Account }) {
  const [open, setOpen] = useState(false);
  const deleteAccount = useDeleteAccount();

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button variant="ghost" size="icon-sm" />}>
        <Trash2 />
        <span className="sr-only">Delete {account.name}</span>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {account.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            This archives the account. Its past records stay in your
            history, but it won&apos;t appear in totals anymore.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => {
              setOpen(false);
              deleteAccount.mutate(account._id);
            }}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function AccountsView({ initialData }: { initialData: Account[] }) {
  const { data: accounts } = useAccounts(initialData);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl text-foreground">Accounts</h1>
          <p className="text-sm text-muted-foreground">
            Every bank account, wallet, and card in one place.
          </p>
        </div>
        <AccountFormDialog
          trigger={
            <Button>
              <Plus />
              Add account
            </Button>
          }
        />
      </div>

      {accounts.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Wallet />
            </EmptyMedia>
            <EmptyTitle>No accounts yet</EmptyTitle>
            <EmptyDescription>
              Add your first account to start tracking balances.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <AccountFormDialog
              trigger={<Button size="sm">Add an account</Button>}
            />
          </EmptyContent>
        </Empty>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead className="w-0" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.map((account) => (
              <TableRow key={account._id}>
                <TableCell className="font-medium text-foreground">
                  {account.name}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {ACCOUNT_TYPE_LABELS[account.type]}
                </TableCell>
                <TableCell
                  className={cn(
                    "text-right font-mono tabular-nums",
                    account.balance < 0 ? "text-negative" : "text-foreground",
                  )}
                >
                  {formatCurrency(account.balance, account.currency)}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <AccountFormDialog
                      account={account}
                      trigger={
                        <Button variant="ghost" size="icon-sm">
                          <PenLine />
                          <span className="sr-only">Edit {account.name}</span>
                        </Button>
                      }
                    />
                    <DeleteAccountAlert account={account} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
