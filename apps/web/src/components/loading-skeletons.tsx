import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Shared pieces for route-level loading states.
 *
 * House rule: a loading screen is the ledger page before the ink. Anything
 * that isn't data -- headings, static copy, table column headers, divider
 * rules, card titles -- renders for real and immediately. Only the values
 * that get written in stay blank. That keeps each skeleton geometrically
 * identical to its loaded page, so nothing jumps when the data lands.
 */

/** A bare blank. Use `TextBlank` for anything standing in for text. */
export function Blank({ className }: { className?: string }) {
  return (
    <Skeleton className={cn("h-4 motion-reduce:animate-none", className)} />
  );
}

/**
 * Line-box heights for the type scale, so a blank occupies exactly the
 * space its text will. `box` is the line height of the real text; `bar` is
 * the visible mark inside it, kept thinner so the page reads as ruled
 * rather than blocked out.
 */
const TEXT_SIZES = {
  xs: { box: "h-4", bar: "h-2.5" },
  sm: { box: "h-5", bar: "h-3" },
  base: { box: "h-6", bar: "h-3.5" },
  "2xl": { box: "h-8", bar: "h-5" },
  hero: { box: "h-12 sm:h-15", bar: "h-8 sm:h-10" },
} as const;

/** Stands in for a run of text without changing the layout around it. */
export function TextBlank({
  size = "sm",
  className,
  barClassName,
}: {
  size?: keyof typeof TEXT_SIZES;
  /** Width lives here -- it sizes the line box. */
  className?: string;
  barClassName?: string;
}) {
  const { box, bar } = TEXT_SIZES[size];
  return (
    <span className={cn("flex items-center", box, className)}>
      <Skeleton
        className={cn("w-full motion-reduce:animate-none", bar, barClassName)}
      />
    </span>
  );
}

/** Matches the default `Button` footprint (h-8) so action rows don't shift. */
export function ButtonBlank({ className }: { className?: string }) {
  return <Blank className={cn("h-8 w-28", className)} />;
}

/** The two ghost icon-sm actions that close out a record or account row. */
export function RowActionsBlank() {
  return (
    <div className="-mr-2 flex shrink-0 gap-1">
      <Blank className="size-7" />
      <Blank className="size-7" />
    </div>
  );
}

/**
 * The page title and its standfirst are fixed per route, not fetched, so
 * they render as real text the moment the skeleton paints.
 */
export function LoadingHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h1 className="font-heading text-2xl text-foreground">{title}</h1>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

/**
 * Entry widths cycle through a fixed set so rows read like handwritten
 * entries rather than a bar chart. Deterministic on purpose -- a random
 * width would disagree between the server and client render.
 */
const ENTRY_WIDTHS = ["w-40", "w-28", "w-52", "w-36", "w-44", "w-32"];

export function entryWidth(index: number) {
  return ENTRY_WIDTHS[index % ENTRY_WIDTHS.length];
}

/** Amounts are right-aligned and tabular, so their blanks vary less. */
const AMOUNT_WIDTHS = ["w-20", "w-16", "w-24", "w-16"];

export function amountWidth(index: number) {
  return AMOUNT_WIDTHS[index % AMOUNT_WIDTHS.length];
}

/** `Array.from` with an index, minus the ceremony at every call site. */
export function rows(count: number) {
  return Array.from({ length: count }, (_, index) => index);
}
