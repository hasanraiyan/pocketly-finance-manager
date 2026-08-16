import type { Metadata } from "next";
import { Fraunces, Geist_Mono, Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  axes: ["opsz", "SOFT", "WONK"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pocketly",
  description: "Track, understand, and improve your personal finances.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#20402d",
          colorBackground: "#f8f4ea",
          colorForeground: "#241f17",
          colorMutedForeground: "#8a8171",
          colorDanger: "#a2542f",
          borderRadius: "0.625rem",
          fontFamily: "var(--font-sans)",
        },
      }}
    >
      <html
        lang="en"
        className={cn(
          "h-full",
          "antialiased",
          fraunces.variable,
          geistMono.variable,
          inter.variable,
          "font-sans",
        )}
      >
        <body className="min-h-full flex flex-col">
          <TooltipProvider>{children}</TooltipProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
