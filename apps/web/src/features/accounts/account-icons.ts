import {
  Banknote,
  Bitcoin,
  Briefcase,
  Building2,
  Car,
  Coins,
  CreditCard,
  Gem,
  Gift,
  GraduationCap,
  HeartPulse,
  Home,
  Landmark,
  PiggyBank,
  Plane,
  ShoppingBag,
  Smartphone,
  TrendingUp,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { Account } from "./hooks";

export const ACCOUNT_ICONS = {
  landmark: { icon: Landmark, label: "Bank" },
  wallet: { icon: Wallet, label: "Wallet" },
  "piggy-bank": { icon: PiggyBank, label: "Savings" },
  "credit-card": { icon: CreditCard, label: "Card" },
  banknote: { icon: Banknote, label: "Cash" },
  smartphone: { icon: Smartphone, label: "UPI" },
  coins: { icon: Coins, label: "Coins" },
  "trending-up": { icon: TrendingUp, label: "Investments" },
  "building-2": { icon: Building2, label: "Business" },
  briefcase: { icon: Briefcase, label: "Work" },
  home: { icon: Home, label: "Home" },
  car: { icon: Car, label: "Vehicle" },
  plane: { icon: Plane, label: "Travel" },
  "shopping-bag": { icon: ShoppingBag, label: "Shopping" },
  "heart-pulse": { icon: HeartPulse, label: "Health" },
  gift: { icon: Gift, label: "Gift" },
  gem: { icon: Gem, label: "Valuables" },
  bitcoin: { icon: Bitcoin, label: "Crypto" },
  users: { icon: Users, label: "Shared" },
  "graduation-cap": { icon: GraduationCap, label: "Education" },
} as const satisfies Record<string, { icon: LucideIcon; label: string }>;

export type AccountIconKey = keyof typeof ACCOUNT_ICONS;

const DEFAULT_ICON_BY_TYPE: Record<Account["type"], AccountIconKey> = {
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

/** Resolves a stored icon value to a known key, falling back to a sensible default per account type. */
export function resolveAccountIconKey(
  icon: string | undefined,
  type: Account["type"],
): AccountIconKey {
  if (icon && isAccountIconKey(icon)) return icon;
  return DEFAULT_ICON_BY_TYPE[type];
}

export function defaultAccountIcon(type: Account["type"]): AccountIconKey {
  return DEFAULT_ICON_BY_TYPE[type];
}
