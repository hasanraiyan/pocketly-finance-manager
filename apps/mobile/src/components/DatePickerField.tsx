import React, { useState } from "react";
import { Feather } from "@expo/vector-icons";
import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import {
  Modal,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import { Button } from "@/components/Button";
import { formatDate } from "@/lib/format";
import { theme } from "@/lib/theme";

interface DatePickerFieldProps {
  label: string;
  value?: string | null; // YYYY-MM-DD or ISO string
  onChange: (dateString: string) => void;
  placeholder?: string;
  error?: string;
}

export function DatePickerField({
  label,
  value,
  onChange,
  placeholder = "Select date",
  error,
}: DatePickerFieldProps) {
  const [iosModalVisible, setIosModalVisible] = useState(false);

  // Parse current date or default to now
  const parsedDate = value ? new Date(value) : new Date();
  const currentDate = isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
  const [tempDate, setTempDate] = useState<Date>(currentDate);

  function handleDatePicked(selected: Date) {
    const yyyy = selected.getFullYear();
    const mm = String(selected.getMonth() + 1).padStart(2, "0");
    const dd = String(selected.getDate()).padStart(2, "0");
    onChange(`${yyyy}-${mm}-${dd}`);
  }

  function handleOpenPicker() {
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: currentDate,
        onChange: (event: DateTimePickerEvent, date?: Date) => {
          if (event.type === "set" && date) {
            handleDatePicked(date);
          }
        },
        mode: "date",
        is24Hour: true,
      });
    } else if (Platform.OS === "ios") {
      setTempDate(currentDate);
      setIosModalVisible(true);
    } else {
      // Fallback on web or other platforms
      const input = prompt("Enter Date (YYYY-MM-DD)", value ?? "");
      if (input) onChange(input);
    }
  }

  const isToday =
    value &&
    new Date(value).toDateString() === new Date().toDateString();

  return (
    <View className="gap-1.5">
      <Text className="text-sm font-medium text-foreground">{label}</Text>

      <Pressable
        onPress={handleOpenPicker}
        className="flex-row items-center justify-between h-11 rounded-lg border border-border bg-card px-3 active:opacity-80"
      >
        <View className="flex-row items-center gap-2.5">
          <Feather name="calendar" size={16} color={theme.primary} />
          <Text
            className={`text-sm ${
              value ? "text-foreground font-medium" : "text-muted-foreground"
            }`}
          >
            {value
              ? `${formatDate(value)}${isToday ? " (Today)" : ""}`
              : placeholder}
          </Text>
        </View>

        <Feather name="chevron-down" size={16} color={theme.mutedForeground} />
      </Pressable>

      {error && <Text className="text-xs text-negative">{error}</Text>}

      {/* iOS Modal Date Picker */}
      {Platform.OS === "ios" && (
        <Modal
          visible={iosModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setIosModalVisible(false)}
        >
          <View className="flex-1 justify-end bg-black/50">
            <View className="rounded-t-3xl bg-background p-6 pb-8 border-t border-border">
              <View className="flex-row items-center justify-between mb-4">
                <Text className="font-heading text-lg text-foreground">
                  {label}
                </Text>
                <Pressable
                  onPress={() => setIosModalVisible(false)}
                  hitSlop={8}
                  className="h-8 w-8 items-center justify-center rounded-full bg-muted"
                >
                  <Feather name="x" size={16} color={theme.foreground} />
                </Pressable>
              </View>

              <DateTimePicker
                value={tempDate}
                mode="date"
                display="spinner"
                onChange={(_event: DateTimePickerEvent, date?: Date) => {
                  if (date) setTempDate(date);
                }}
                textColor={theme.foreground}
              />

              <View className="flex-row gap-3 mt-4">
                <Button
                  className="flex-1"
                  onPress={() => {
                    handleDatePicked(tempDate);
                    setIosModalVisible(false);
                  }}
                >
                  Confirm Date
                </Button>
                <Button
                  variant="outline"
                  onPress={() => setIosModalVisible(false)}
                >
                  Cancel
                </Button>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}
