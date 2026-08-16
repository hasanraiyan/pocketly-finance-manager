/**
 * Same warm-off-white + deep-green identity as apps/web, converted once
 * from apps/web/src/app/globals.css's OKLCH tokens (RN/NativeWind has no
 * oklch() support, so these are precomputed hex equivalents).
 */
export const theme = {
  background: "#faf6ed",
  foreground: "#231c12",
  card: "#fefcf8",
  primary: "#193b24",
  primaryForeground: "#f9f5eb",
  secondary: "#f1eadf",
  secondaryForeground: "#30271c",
  muted: "#eee9df",
  mutedForeground: "#6b6254",
  accent: "#e2dfc9",
  accentForeground: "#30271c",
  positive: "#193b24",
  negative: "#b54b19",
  border: "#dfd8cd",
} as const;
