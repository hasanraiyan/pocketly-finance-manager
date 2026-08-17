"use client";

import { useState } from "react";
import {
  ChevronUp,
  MessageSquare,
  Sparkles,
  Bug,
  Lightbulb,
  Palette,
  Bot,
  CircleHelp,
  Trash2,
  CheckCircle2,
  Clock,
  Hammer,
  RotateCcw,
  Star,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import {
  useToggleUpvote,
  useDeleteFeedback,
  type FeedbackItem,
} from "./hooks";

const STATUS_CONFIG: Record<
  string,
  { label: string; tone: string; icon: React.ComponentType<{ className?: string }> }
> = {
  submitted: { label: "Submitted", tone: "bg-muted text-muted-foreground", icon: Clock },
  under_review: { label: "Under Review", tone: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20", icon: RotateCcw },
  planned: { label: "Planned", tone: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20", icon: Clock },
  in_progress: { label: "In Progress", tone: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20", icon: Hammer },
  shipped: { label: "Shipped", tone: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20", icon: CheckCircle2 },
  rejected: { label: "Declined", tone: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20", icon: RotateCcw },
};

const CATEGORY_CONFIG: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  feature_request: { label: "Feature Idea", icon: Lightbulb },
  bug: { label: "Bug Report", icon: Bug },
  ux_ui: { label: "UX / UI", icon: Palette },
  financial_intelligence: { label: "Intelligence", icon: Sparkles },
  mcp: { label: "MCP AI", icon: Bot },
  general: { label: "General", icon: MessageSquare },
  other: { label: "Other", icon: CircleHelp },
};

export function FeedbackCard({ item }: { item: FeedbackItem }) {
  const upvoteMutation = useToggleUpvote();
  const deleteMutation = useDeleteFeedback();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const statusMeta = STATUS_CONFIG[item.status] || STATUS_CONFIG.submitted;
  const StatusIcon = statusMeta.icon;

  const categoryMeta = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.general;
  const CategoryIcon = categoryMeta.icon;

  const handleVote = () => {
    upvoteMutation.mutate(item._id);
  };

  const handleDelete = () => {
    deleteMutation.mutate(item._id);
    setDeleteOpen(false);
  };

  return (
    <Card className="transition-all hover:border-border/80 hover:shadow-xs">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start gap-3 sm:gap-4">
          {/* Upvote Button */}
          <button
            type="button"
            onClick={handleVote}
            disabled={upvoteMutation.isPending}
            className={cn(
              "flex flex-col items-center justify-center min-w-12 h-14 rounded-xl border p-1 text-xs font-semibold transition-all shrink-0",
              item.hasUpvoted
                ? "border-primary bg-primary text-primary-foreground shadow-xs scale-[1.02]"
                : "border-border bg-card/60 text-muted-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-foreground",
            )}
          >
            <ChevronUp
              className={cn(
                "size-5 transition-transform",
                item.hasUpvoted ? "translate-y-[-1px]" : "",
              )}
            />
            <span className="tabular-nums">{item.upvoteCount}</span>
          </button>

          {/* Body */}
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="gap-1 text-2xs font-medium">
                <CategoryIcon className="size-3 text-muted-foreground" />
                <span>{categoryMeta.label}</span>
              </Badge>

              <Badge
                variant="outline"
                className={cn("gap-1 text-2xs font-medium border", statusMeta.tone)}
              >
                <StatusIcon className="size-3" />
                <span>{statusMeta.label}</span>
              </Badge>

              {item.rating && (
                <div className="flex items-center gap-0.5 text-amber-500">
                  <Star className="size-3 fill-amber-500" />
                  <span className="text-2xs font-mono font-medium">{item.rating}/5</span>
                </div>
              )}

              <span className="text-2xs text-muted-foreground ml-auto font-mono">
                {formatDate(item.createdAt)}
              </span>
            </div>

            <div>
              <h3 className="font-heading text-base font-semibold leading-tight text-foreground">
                {item.title}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                {item.description}
              </p>
            </div>

            {/* Admin Response if available */}
            {item.adminResponse && (
              <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs">
                <div className="flex items-center gap-1.5 font-medium text-primary mb-1">
                  <Sparkles className="size-3.5" />
                  <span>Pocketly Team Update</span>
                </div>
                <p className="text-foreground/90 whitespace-pre-line leading-relaxed">
                  {item.adminResponse}
                </p>
              </div>
            )}

            {/* Owner Footer actions */}
            {item.isOwner && (
              <div className="flex items-center justify-between pt-1">
                <span className="text-2xs text-primary font-medium">
                  Your submission
                </span>
                <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                  <AlertDialogTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-2xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="size-3 mr-1" />
                        Delete
                      </Button>
                    }
                  />
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this feedback?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will remove your suggestion from Pocketly feedback and roadmap board.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
