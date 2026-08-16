import { View } from "react-native";

export function ProgressBar({ value }: { value: number }) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <View className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <View
        className="h-full rounded-full bg-primary"
        style={{ width: `${clamped}%` }}
      />
    </View>
  );
}
