"use client";

import { useState } from "react";
import { Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { useExportPdf } from "./hooks";

const PERIOD_OPTIONS = [
  { value: "7d", label: "Last 7 days" },
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "3m", label: "Last 3 months" },
  { value: "6m", label: "Last 6 months" },
  { value: "this_year", label: "This year" },
  { value: "custom", label: "Custom date range" },
] as const;

type Period = (typeof PERIOD_OPTIONS)[number]["value"];

export function ExportDialog({ trigger }: { trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [period, setPeriod] = useState<Period>("this_month");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const exportPdf = useExportPdf();

  const isCustom = period === "custom";
  const isCustomInvalid = isCustom && (!from || !to);

  const handleExport = async () => {
    await exportPdf.mutateAsync({
      period,
      ...(isCustom && from && to ? { from, to } : {}),
    });
    setOpen(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!exportPdf.isPending) setOpen(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="size-4 text-muted-foreground" />
            Export Financial Report
          </DialogTitle>
          <DialogDescription>
            Generate a PDF summary of your transactions. The report will be
            emailed to you when ready.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <Field>
            <FieldLabel>Period</FieldLabel>
            <NativeSelect
              value={period}
              onChange={(e) => setPeriod(e.target.value as Period)}
            >
              {PERIOD_OPTIONS.map((opt) => (
                <NativeSelectOption key={opt.value} value={opt.value}>
                  {opt.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>

          {isCustom && (
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel>From</FieldLabel>
                <Input
                  id="export-from"
                  type="date"
                  value={from}
                  max={to || undefined}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel>To</FieldLabel>
                <Input
                  id="export-to"
                  type="date"
                  value={to}
                  min={from || undefined}
                  onChange={(e) => setTo(e.target.value)}
                />
              </Field>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            📧 The PDF will be sent to your account email once generated.
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={exportPdf.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={exportPdf.isPending || isCustomInvalid}
          >
            {exportPdf.isPending ? (
              <Spinner className="size-4" />
            ) : (
              <Download className="size-4" />
            )}
            {exportPdf.isPending ? "Queueing…" : "Export PDF"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
