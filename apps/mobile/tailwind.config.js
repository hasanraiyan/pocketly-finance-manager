/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Same warm-off-white + deep-green identity as apps/web
        // (converted once from apps/web/src/app/globals.css's OKLCH tokens).
        background: "#faf6ed",
        foreground: "#231c12",
        card: "#fefcf8",
        primary: "#193b24",
        "primary-foreground": "#f9f5eb",
        primaryForeground: "#f9f5eb",
        secondary: "#f1eadf",
        "secondary-foreground": "#30271c",
        secondaryForeground: "#30271c",
        muted: "#eee9df",
        "muted-foreground": "#6b6254",
        mutedForeground: "#6b6254",
        accent: "#e2dfc9",
        "accent-foreground": "#30271c",
        accentForeground: "#30271c",
        positive: "#193b24",
        negative: "#b54b19",
        border: "#dfd8cd",
      },
      fontFamily: {
        heading: ["Fraunces_500Medium"],
        sans: ["Inter_400Regular"],
      },
    },
  },
  plugins: [],
};
