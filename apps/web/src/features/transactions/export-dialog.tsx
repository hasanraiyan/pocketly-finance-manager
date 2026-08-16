"use client";

import { useState } from "react";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
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
import { useExportCsv, useExportPdf } from "./hooks";

const PERIOD_OPTIONS = [
  { value: "7d", label: "Last 7 days" },
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "3m", label: "Last 3 months" },
  { value: "6m", label: "Last 6 months" },
  { value: "this_year", label: "This year" },
  { value: "all_time", label: "All time" },
  { value: "custom", label: "Custom date range" },
] as const;

type Period = (typeof PERIOD_OPTIONS)[number]["value"];
type ExportFormat = "pdf" | "csv";

export function ExportDialog({ trigger }: { trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<ExportFormat>("pdf");
  const [period, setPeriod] = useState<Period>("this_month");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const exportPdf = useExportPdf();
  const exportCsv = useExportCsv();

  const isPending = exportPdf.isPending || exportCsv.isPending;
  const isCustom = period === "custom";
  const isCustomInvalid = isCustom && (!from || !to);

  const handleExport = async () => {
    const payload = {
      period,
      ...(isCustom && from && to ? { from, to } : {}),
    };

    if (format === "pdf") {
      await exportPdf.mutateAsync(payload);
    } else {
      await exportCsv.mutateAsync(payload);
    }
    setOpen(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!isPending) setOpen(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {format === "pdf" ? (
              <FileText className="size-4 text-muted-foreground" />
            ) : (
              <FileSpreadsheet className="size-4 text-muted-foreground" />
            )}
            Export Financial Data
          </DialogTitle>
          <DialogDescription>
            Download your financial transactions. The export will be processed in
            the background and emailed to you.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <Field>
            <FieldLabel>Format</FieldLabel>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormat("pdf")}
                className={`flex items-center justify-center gap-2 border p-2.5 text-xs font-medium transition-colors ${
                  format === "pdf"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                <FileText className="size-4" />
                PDF Statement
              </button>
              <button
                type="button"
                onClick={() => setFormat("csv")}
                className={`flex items-center justify-center gap-2 border p-2.5 text-xs font-medium transition-colors ${
                  format === "csv"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                <FileSpreadsheet className="size-4" />
                CSV Spreadsheet
              </button>
            </div>
          </Field>

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
            📧 The {format.toUpperCase()} file will be emailed to your registered account email.
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={isPending || isCustomInvalid}
          >
            {isPending ? (
              <Spinner className="size-4" />
            ) : (
              <Download className="size-4" />
            )}
            {isPending
              ? "Queueing…"
              : `Export ${format.toUpperCase()}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
