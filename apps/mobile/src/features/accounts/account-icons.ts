import type { ComponentProps } from "react";
import type { Feather } from "@expo/vector-icons";

export type FeatherIconName = ComponentProps<typeof Feather>["name"];

export const ACCOUNT_ICONS: Record<
  string,
  { icon: FeatherIconName; label: string }
> = {
  landmark: { icon: "columns", label: "Bank" },
  wallet: { icon: "pocket", label: "Wallet" },
  "piggy-bank": { icon: "archive", label: "Savings" },
  "credit-card": { icon: "credit-card", label: "Card" },
  banknote: { icon: "dollar-sign", label: "Cash" },
  smartphone: { icon: "smartphone", label: "UPI" },
  coins: { icon: "disc", label: "Coins" },
  "trending-up": { icon: "trending-up", label: "Investments" },
  "building-2": { icon: "grid", label: "Business" },
  briefcase: { icon: "briefcase", label: "Work" },
  home: { icon: "home", label: "Home" },
  car: { icon: "truck", label: "Vehicle" },
  plane: { icon: "send", label: "Travel" },
  "shopping-bag": { icon: "shopping-bag", label: "Shopping" },
  "heart-pulse": { icon: "heart", label: "Health" },
  gift: { icon: "gift", label: "Gift" },
  gem: { icon: "award", label: "Valuables" },
  bitcoin: { icon: "cpu", label: "Crypto" },
  users: { icon: "users", label: "Shared" },
  "graduation-cap": { icon: "book-open", label: "Education" },
};

export type AccountIconKey = keyof typeof ACCOUNT_ICONS;

export type AccountType =
  | "bank"
  | "cash"
  | "savings"
  | "upi"
  | "credit_card"
  | "wallet";

export const ACCOUNT_TYPE_OPTIONS: Array<{
  value: AccountType;
  label: string;
}> = [
  { value: "bank", label: "Bank" },
  { value: "cash", label: "Cash" },
  { value: "savings", label: "Savings" },
  { value: "upi", label: "UPI" },
  { value: "credit_card", label: "Credit card" },
  { value: "wallet", label: "Wallet" },
];

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  bank: "Bank",
  cash: "Cash",
  savings: "Savings",
  upi: "UPI",
  credit_card: "Credit card",
  wallet: "Wallet",
};

const DEFAULT_ICON_BY_TYPE: Record<AccountType, AccountIconKey> = {
  bank: "landmark",
  cash: "banknote",
  savings: "piggy-bank",
  upi: "smartphone",
  credit_card: "credit-card",
  wallet: "wallet",
};

export function isAccountIconKey(value: string): value is AccountIconKey {
  return value in ACCOUNT_ICONS;
}

export function resolveAccountIconKey(
  icon: string | undefined,
  type: AccountType,
): AccountIconKey {
  if (icon && isAccountIconKey(icon)) return icon;
  return DEFAULT_ICON_BY_TYPE[type] ?? "landmark";
}

export function defaultAccountIcon(type: AccountType): AccountIconKey {
  return DEFAULT_ICON_BY_TYPE[type] ?? "landmark";
}
