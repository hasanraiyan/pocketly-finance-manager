"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import {
  MessageSquarePlus,
  Sparkles,
  Bug,
  Lightbulb,
  Palette,
  Bot,
  CircleHelp,
  Star,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  useCreateFeedback,
  type FeedbackCategory,
  type FeedbackType,
} from "./hooks";

const CATEGORIES: {
  id: FeedbackCategory;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  type: FeedbackType;
}[] = [
  { id: "feature_request", label: "Feature Idea", icon: Lightbulb, type: "feature_request" },
  { id: "bug", label: "Bug Report", icon: Bug, type: "feedback" },
  { id: "ux_ui", label: "UX / UI", icon: Palette, type: "feedback" },
  {
    id: "financial_intelligence",
    label: "Intelligence",
    icon: Sparkles,
    type: "feedback",
  },
  { id: "mcp", label: "MCP AI", icon: Bot, type: "feedback" },
  { id: "general", label: "General", icon: MessageSquarePlus, type: "feedback" },
  { id: "other", label: "Other", icon: CircleHelp, type: "feedback" },
];

export function FeedbackDialog({
  trigger,
  defaultCategory = "feature_request",
}: {
  trigger?: React.ReactNode;
  defaultCategory?: FeedbackCategory;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const createMutation = useCreateFeedback();

  const [category, setCategory] = useState<FeedbackCategory>(defaultCategory);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [rating, setRating] = useState<number | null>(null);

  const selectedCategoryMeta = CATEGORIES.find((c) => c.id === category);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    await createMutation.mutateAsync({
      type: selectedCategoryMeta?.type ?? "feedback",
      category,
      title: title.trim(),
      description: description.trim(),
      rating: rating ?? undefined,
      pageContext: pathname,
    });

    setTitle("");
    setDescription("");
    setRating(null);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          (trigger as React.ReactElement) ?? (
            <Button variant="outline" size="sm" className="gap-2">
              <MessageSquarePlus className="size-4" />
              <span>Feedback</span>
            </Button>
          )
        }
      />
      <DialogContent className="max-w-lg sm:max-w-xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="size-5 text-primary" />
              <span>Share Feedback or Feature Idea</span>
            </DialogTitle>
            <DialogDescription>
              Help shape the future of Pocketly. We read and review every suggestion.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Label>Category</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border p-2.5 text-left text-xs font-medium transition-colors",
                      isSelected
                        ? "border-primary bg-primary/10 text-primary font-semibold shadow-xs"
                        : "border-border bg-card/50 text-muted-foreground hover:bg-accent hover:text-foreground",
                    )}
                  >
                    <Icon className={cn("size-4 shrink-0", isSelected ? "text-primary" : "text-muted-foreground")} />
                    <span className="truncate">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="feedback-title">Title / Summary</Label>
            <Input
              id="feedback-title"
              placeholder={
                category === "bug"
                  ? "e.g., Transaction table doesn't sort properly on mobile"
                  : "e.g., Add multi-currency auto conversion in analytics"
              }
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="feedback-description">Details & Context</Label>
            <Textarea
              id="feedback-description"
              placeholder={
                category === "bug"
                  ? "Describe what happened and how to reproduce it..."
                  : "What problem does this solve for your financial routine?"
              }
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              maxLength={4000}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground mr-1">Experience rating (optional):</span>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(rating === star ? null : star)}
                  className="rounded p-1 text-muted-foreground hover:text-amber-500 transition-colors"
                >
                  <Star
                    className={cn(
                      "size-4",
                      rating && star <= rating
                        ? "fill-amber-500 text-amber-500"
                        : "text-muted-foreground/40",
                    )}
                  />
                </button>
              ))}
            </div>

            {pathname && (
              <span className="text-2xs text-muted-foreground font-mono bg-muted px-2 py-0.5 rounded">
                Context: {pathname}
              </span>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!title.trim() || !description.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Feedback"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
