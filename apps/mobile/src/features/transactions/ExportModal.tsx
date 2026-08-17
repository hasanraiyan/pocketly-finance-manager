import React, { useState } from "react";
import { Feather } from "@expo/vector-icons";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Button } from "@/components/Button";
import { DatePickerField } from "@/components/DatePickerField";
import { TextField } from "@/components/TextField";
import { theme } from "@/lib/theme";
import { useExportCsv, useExportPdf } from "./hooks";

const PERIOD_OPTIONS = [
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "7d", label: "Last 7 days" },
  { value: "3m", label: "Last 3 months" },
  { value: "this_year", label: "This year" },
  { value: "all_time", label: "All time" },
  { value: "custom", label: "Custom Range" },
] as const;

type Period = (typeof PERIOD_OPTIONS)[number]["value"];
type ExportFormat = "pdf" | "csv";

interface ExportModalProps {
  visible: boolean;
  onClose: () => void;
}

export function ExportModal({ visible, onClose }: ExportModalProps) {
  const [format, setFormat] = useState<ExportFormat>("pdf");
  const [period, setPeriod] = useState<Period>("this_month");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const exportPdf = useExportPdf();
  const exportCsv = useExportCsv();

  const isPending = exportPdf.isPending || exportCsv.isPending;
  const isCustom = period === "custom";

  async function handleExport() {
    if (isCustom && (!from || !to)) {
      Alert.alert("Missing Dates", "Please provide both Start and End dates.");
      return;
    }

    const payload = {
      period,
      ...(isCustom && from && to
        ? { from: `${from}T00:00:00.000Z`, to: `${to}T23:59:59.999Z` }
        : {}),
    };

    try {
      if (format === "pdf") {
        const res = await exportPdf.mutateAsync(payload);
        Alert.alert(
          "Report Queued",
          res.message ?? "Your PDF report will be emailed to you shortly.",
        );
      } else {
        const res = await exportCsv.mutateAsync(payload);
        Alert.alert(
          "CSV Queued",
          res.message ?? "Your CSV export will be emailed to you shortly.",
        );
      }
      onClose();
    } catch (err) {
      Alert.alert(
        "Export Failed",
        err instanceof Error ? err.message : "Could not queue export report.",
      );
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        className="flex-1 justify-end md:justify-center md:items-center bg-black/60 md:p-6"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View className="w-full md:max-w-xl max-h-[90%] rounded-t-3xl md:rounded-3xl bg-background px-6 pb-8 pt-6 border-t md:border border-border">
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="font-heading text-xl text-foreground">
              Export Records
            </Text>
            <Pressable
              onPress={onClose}
              hitSlop={8}
              className="h-8 w-8 items-center justify-center rounded-full bg-muted"
            >
              <Feather name="x" size={18} color={theme.foreground} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View className="gap-5 py-2">
              <Text className="text-xs text-muted-foreground">
                Your report will be generated and emailed directly to your
                verified account address.
              </Text>

              {/* Format Selection */}
              <View className="gap-2">
                <Text className="text-sm font-medium text-foreground">
                  Format
                </Text>
                <View className="flex-row gap-3">
                  <Pressable
                    onPress={() => setFormat("pdf")}
                    className={`flex-1 flex-row items-center justify-center gap-2 rounded-xl p-3.5 border ${
                      format === "pdf"
                        ? "bg-primary border-primary"
                        : "bg-card border-border"
                    }`}
                  >
                    <Feather
                      name="file-text"
                      size={18}
                      color={
                        format === "pdf"
                          ? theme.primaryForeground
                          : theme.foreground
                      }
                    />
                    <Text
                      className={`text-xs font-semibold ${
                        format === "pdf"
                          ? "text-primary-foreground"
                          : "text-foreground"
                      }`}
                    >
                      PDF Report
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setFormat("csv")}
                    className={`flex-1 flex-row items-center justify-center gap-2 rounded-xl p-3.5 border ${
                      format === "csv"
                        ? "bg-primary border-primary"
                        : "bg-card border-border"
                    }`}
                  >
                    <Feather
                      name="file"
                      size={18}
                      color={
                        format === "csv"
                          ? theme.primaryForeground
                          : theme.foreground
                      }
                    />
                    <Text
                      className={`text-xs font-semibold ${
                        format === "csv"
                          ? "text-primary-foreground"
                          : "text-foreground"
                      }`}
                    >
                      CSV Spreadsheet
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* Period Selection */}
              <View className="gap-2">
                <Text className="text-sm font-medium text-foreground">
                  Time Period
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {PERIOD_OPTIONS.map((opt) => {
                    const isSelected = period === opt.value;
                    return (
                      <Pressable
                        key={opt.value}
                        onPress={() => setPeriod(opt.value)}
                        className={`rounded-lg px-3.5 py-2 border ${
                          isSelected
                            ? "bg-primary border-primary"
                            : "bg-card border-border"
                        }`}
                      >
                        <Text
                          className={`text-xs font-medium ${
                            isSelected
                              ? "text-primary-foreground"
                              : "text-foreground"
                          }`}
                        >
                          {opt.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Custom Date Range */}
              {isCustom && (
                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <DatePickerField
                      label="From Date"
                      placeholder="Start date"
                      value={from}
                      onChange={setFrom}
                    />
                  </View>
                  <View className="flex-1">
                    <DatePickerField
                      label="To Date"
                      placeholder="End date"
                      value={to}
                      onChange={setTo}
                    />
                  </View>
                </View>
              )}

              <View className="mt-4 gap-2">
                <Button loading={isPending} onPress={handleExport}>
                  Queue Export
                </Button>
                <Button variant="ghost" onPress={onClose} disabled={isPending}>
                  Cancel
                </Button>
              </View>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
