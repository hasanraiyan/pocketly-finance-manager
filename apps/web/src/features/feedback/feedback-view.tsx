"use client";

import { useState, useMemo } from "react";
import {
  Search,
  Sparkles,
  Layers,
  ArrowUpDown,
  Filter,
  Lightbulb,
  CheckCircle2,
  Hammer,
  Clock,
  MessageSquare,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FeedbackDialog } from "./feedback-dialog";
import { FeedbackCard } from "./feedback-card";
import {
  useFeedbackList,
  type FeedbackCategory,
  type FeedbackItem,
} from "./hooks";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const CATEGORY_TABS: { id: FeedbackCategory | "all"; label: string }[] = [
  { id: "all", label: "All Items" },
  { id: "feature_request", label: "Feature Ideas" },
  { id: "bug", label: "Bugs" },
  { id: "ux_ui", label: "UX / UI" },
  { id: "financial_intelligence", label: "Intelligence" },
  { id: "mcp", label: "MCP AI" },
  { id: "general", label: "General" },
];

export function FeedbackView({
  initialData = [],
}: {
  initialData?: FeedbackItem[];
}) {
  const [activeTab, setActiveTab] = useState<"roadmap" | "all" | "my_submissions">("roadmap");
  const [selectedCategory, setSelectedCategory] = useState<FeedbackCategory | "all">("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"upvotes" | "recent">("upvotes");

  const queryOptions = useMemo(() => ({
    category: selectedCategory === "all" ? undefined : selectedCategory,
    search: search.trim() || undefined,
    sortBy,
    onlyMine: activeTab === "my_submissions",
  }), [selectedCategory, search, sortBy, activeTab]);

  const { data, isLoading } = useFeedbackList(queryOptions, initialData);
  const items = data?.items ?? initialData;

  // Roadmap grouping for "roadmap" tab
  const roadmapPlanned = useMemo(
    () => items.filter((item) => item.status === "planned"),
    [items],
  );
  const roadmapInProgress = useMemo(
    () => items.filter((item) => item.status === "in_progress"),
    [items],
  );
  const roadmapShipped = useMemo(
    () => items.filter((item) => item.status === "shipped"),
    [items],
  );

  return (
    <div className="space-y-6">
      {/* Header & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-5">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Feedback & Feature Roadmap
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Share ideas, report bugs, and vote on upcoming features to guide what we build next for Pocketly.
          </p>
        </div>
        <div className="shrink-0">
          <FeedbackDialog />
        </div>
      </div>

      {/* Main Tabs (Roadmap vs All Ideas vs My Submissions) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Tabs
          value={activeTab}
          onValueChange={(val) => setActiveTab(val as any)}
          className="w-full sm:w-auto"
        >
          <TabsList className="grid grid-cols-3 w-full sm:w-auto">
            <TabsTrigger value="roadmap" className="gap-1.5 text-xs sm:text-sm">
              <Layers className="size-3.5" />
              <span>Roadmap</span>
            </TabsTrigger>
            <TabsTrigger value="all" className="gap-1.5 text-xs sm:text-sm">
              <Lightbulb className="size-3.5" />
              <span>All Ideas</span>
            </TabsTrigger>
            <TabsTrigger value="my_submissions" className="gap-1.5 text-xs sm:text-sm">
              <MessageSquare className="size-3.5" />
              <span>My Items</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Controls: Search & Sort */}
        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-60">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Search suggestions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 text-xs"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortBy(sortBy === "upvotes" ? "recent" : "upvotes")}
            className="h-9 gap-1.5 text-xs shrink-0"
          >
            <ArrowUpDown className="size-3.5 text-muted-foreground" />
            <span>{sortBy === "upvotes" ? "Top Voted" : "Most Recent"}</span>
          </Button>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {CATEGORY_TABS.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors",
                isSelected
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Content Rendering */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      ) : activeTab === "roadmap" && !search && selectedCategory === "all" ? (
        /* Roadmap Columns */
        <div className="grid gap-6 md:grid-cols-3">
          {/* Planned */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-2">
                <Clock className="size-4 text-blue-500" />
                <span className="font-semibold text-sm">Planned</span>
              </div>
              <span className="text-xs text-muted-foreground font-mono">
                {roadmapPlanned.length}
              </span>
            </div>
            <div className="space-y-3">
              {roadmapPlanned.length === 0 ? (
                <div className="rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">
                  No planned features yet.
                </div>
              ) : (
                roadmapPlanned.map((item) => (
                  <FeedbackCard key={item._id} item={item} />
                ))
              )}
            </div>
          </div>

          {/* In Progress */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-2">
                <Hammer className="size-4 text-purple-500" />
                <span className="font-semibold text-sm">In Progress</span>
              </div>
              <span className="text-xs text-muted-foreground font-mono">
                {roadmapInProgress.length}
              </span>
            </div>
            <div className="space-y-3">
              {roadmapInProgress.length === 0 ? (
                <div className="rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">
                  Nothing currently in development.
                </div>
              ) : (
                roadmapInProgress.map((item) => (
                  <FeedbackCard key={item._id} item={item} />
                ))
              )}
            </div>
          </div>

          {/* Shipped */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-500" />
                <span className="font-semibold text-sm">Shipped</span>
              </div>
              <span className="text-xs text-muted-foreground font-mono">
                {roadmapShipped.length}
              </span>
            </div>
            <div className="space-y-3">
              {roadmapShipped.length === 0 ? (
                <div className="rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">
                  No shipped features in this view.
                </div>
              ) : (
                roadmapShipped.map((item) => (
                  <FeedbackCard key={item._id} item={item} />
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        /* List / Grid of items */
        <div className="space-y-4">
          {items.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-12 text-center">
              <Sparkles className="size-10 text-muted-foreground/50 mx-auto mb-3" />
              <h3 className="font-heading text-base font-semibold text-foreground">
                No submissions found
              </h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                {search
                  ? `No feedback matching "${search}". Try searching for something else.`
                  : activeTab === "my_submissions"
                    ? "You haven't submitted any feedback yet. Share your thoughts!"
                    : "Be the first to share an idea or request a feature!"}
              </p>
              <div className="mt-4">
                <FeedbackDialog />
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {items.map((item) => (
                <FeedbackCard key={item._id} item={item} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
