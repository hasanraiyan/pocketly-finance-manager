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
  CheckCircle2,
  Clock,
  Send,
  MessageSquareQuote,
  Trash2,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import {
  useCreateFeedback,
  useDeleteFeedback,
  useFeedbackList,
  type FeedbackCategory,
  type FeedbackItem,
  type FeedbackType,
  type FeedbackStatus,
} from "./hooks";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const CATEGORIES: {
  id: FeedbackCategory;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  type: FeedbackType;
}[] = [
  { id: "feature_request", label: "Feature Idea", icon: Lightbulb, type: "feature_request" },
  { id: "bug", label: "Bug Report", icon: Bug, type: "feedback" },
  { id: "ux_ui", label: "UX & Design", icon: Palette, type: "feedback" },
  { id: "financial_intelligence", label: "Intelligence", icon: Sparkles, type: "feedback" },
  { id: "mcp", label: "MCP / AI", icon: Bot, type: "feedback" },
  { id: "general", label: "General Feedback", icon: MessageSquarePlus, type: "feedback" },
  { id: "other", label: "Other", icon: CircleHelp, type: "feedback" },
];

const STATUS_CONFIG: Record<
  FeedbackStatus,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive"; className?: string }
> = {
  submitted: { label: "Received", variant: "secondary" },
  under_review: { label: "Under Review", variant: "outline", className: "border-amber-500/30 text-amber-600 dark:text-amber-400" },
  planned: { label: "Planned", variant: "default", className: "bg-blue-600 text-white" },
  in_progress: { label: "In Progress", variant: "default", className: "bg-purple-600 text-white" },
  shipped: { label: "Shipped", variant: "default", className: "bg-emerald-600 text-white" },
  rejected: { label: "Closed", variant: "secondary" },
};

export function FeedbackView({
  initialData = [],
}: {
  initialData?: FeedbackItem[];
}) {
  const pathname = usePathname();
  const createMutation = useCreateFeedback();
  const deleteMutation = useDeleteFeedback();

  // Fetch only this user's submissions
  const { data, isLoading } = useFeedbackList({ onlyMine: true }, initialData);
  const mySubmissions = data?.items ?? initialData;

  const [category, setCategory] = useState<FeedbackCategory>("feature_request");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
    setSubmittedSuccess(true);
    setTimeout(() => setSubmittedSuccess(false), 5000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-12">
      {/* Page Header */}
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Feedback & Feature Requests
        </h1>
        <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
          Tell us what features you would like to see, report an issue, or share your thoughts to help us make Pocketly better.
        </p>
      </div>

      {/* Submission Form Card */}
      <Card className="border-border/70 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <MessageSquarePlus className="size-5 text-primary" />
            <span>Send your feedback</span>
          </CardTitle>
          <CardDescription>
            Your submission goes directly to the Pocketly product team.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Category selection */}
            <div className="space-y-2.5">
              <Label className="text-xs font-medium text-muted-foreground">What kind of feedback is this?</Label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all border",
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary shadow-sm"
                          : "bg-muted/40 hover:bg-muted/80 text-muted-foreground hover:text-foreground border-border/60",
                      )}
                    >
                      <Icon className="size-3.5 shrink-0" />
                      <span>{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="feedback-title" className="text-xs font-medium">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="feedback-title"
                placeholder={
                  category === "bug"
                    ? "e.g., Transaction import fails for CSV files..."
                    : category === "feature_request"
                      ? "e.g., Recurring bills calendar view..."
                      : "e.g., Summary of your suggestion..."
                }
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
                required
                className="h-10 text-sm"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="feedback-desc" className="text-xs font-medium">
                Details & Description <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="feedback-desc"
                placeholder="Explain the problem or how your feature idea would work. The more details you share, the better!"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                required
                className="text-sm resize-y"
              />
            </div>

            {/* Star Rating (Optional) */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">
                Overall experience rating (optional)
              </Label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(rating === star ? null : star)}
                    className="p-1 rounded hover:bg-muted transition-colors focus:outline-none focus:ring-1 focus:ring-primary"
                    aria-label={`Rate ${star} star`}
                  >
                    <Star
                      className={cn(
                        "size-5 transition-colors",
                        rating && rating >= star
                          ? "fill-amber-400 text-amber-400"
                          : "text-muted-foreground/40 hover:text-muted-foreground",
                      )}
                    />
                  </button>
                ))}
                {rating && (
                  <span className="text-xs text-muted-foreground ml-2 font-medium">
                    {rating === 5 ? "Excellent" : rating === 4 ? "Good" : rating === 3 ? "Average" : rating === 2 ? "Needs Work" : "Poor"}
                  </span>
                )}
              </div>
            </div>

            {/* Success message or Submit button */}
            <div className="flex items-center justify-between pt-2 border-t">
              {submittedSuccess ? (
                <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                  <CheckCircle2 className="size-4" />
                  <span>Thank you! Your feedback has been received.</span>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">
                  We review every suggestion carefully.
                </span>
              )}

              <Button
                type="submit"
                disabled={createMutation.isPending || !title.trim() || !description.trim()}
                className="gap-2"
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Send className="size-4" />
                    <span>Send Feedback</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* User's Previous Submissions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-semibold text-foreground">
            Your Submissions
          </h2>
          <span className="text-xs text-muted-foreground">
            {mySubmissions.length} {mySubmissions.length === 1 ? "submission" : "submissions"}
          </span>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <Card key={i} className="p-4 animate-pulse">
                <div className="h-4 bg-muted rounded w-1/3 mb-2" />
                <div className="h-3 bg-muted rounded w-2/3" />
              </Card>
            ))}
          </div>
        ) : mySubmissions.length === 0 ? (
          <Card className="border-dashed bg-muted/20">
            <CardContent className="py-8 text-center">
              <MessageSquarePlus className="size-8 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground">No submissions yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Your sent feedback, feature requests, and bug reports will appear here along with team updates.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {mySubmissions.map((item) => {
              const status = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.submitted;
              const catMeta = CATEGORIES.find((c) => c.id === item.category);
              const CatIcon = catMeta?.icon ?? MessageSquarePlus;

              return (
                <Card key={item._id} className="border-border/70 hover:border-border transition-colors">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1 text-2xs font-medium px-2 py-0.5 rounded bg-muted text-muted-foreground">
                            <CatIcon className="size-3" />
                            {catMeta?.label ?? item.category}
                          </span>
                          <Badge variant={status.variant} className={cn("text-2xs h-5 px-2", status.className)}>
                            {status.label}
                          </Badge>
                          {item.rating && (
                            <span className="inline-flex items-center gap-0.5 text-2xs text-amber-500 font-medium ml-1">
                              <Star className="size-3 fill-amber-400 text-amber-400" />
                              {item.rating}/5
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm font-semibold text-foreground pt-1">
                          {item.title}
                        </h3>
                      </div>

                      {/* Delete button */}
                      <AlertDialog
                        open={deletingId === item._id}
                        onOpenChange={(open) => setDeletingId(open ? item._id : null)}
                      >
                        <AlertDialogTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              title="Delete submission"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          }
                        />
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete this feedback?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will remove your submission from Pocketly.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              variant="destructive"
                              onClick={() => {
                                deleteMutation.mutate(item._id);
                                setDeletingId(null);
                              }}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>

                    <p className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed">
                      {item.description}
                    </p>

                    {/* Admin Response (if team responded) */}
                    {item.adminResponse && (
                      <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs space-y-1.5">
                        <div className="flex items-center gap-1.5 text-primary font-semibold">
                          <MessageSquareQuote className="size-3.5" />
                          <span>Pocketly Team Response</span>
                        </div>
                        <p className="text-foreground/90 whitespace-pre-line leading-relaxed pl-5">
                          {item.adminResponse}
                        </p>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-2xs text-muted-foreground/70 pt-1 border-t border-border/40">
                      <Clock className="size-3" />
                      <span>Submitted {formatDate(item.createdAt)}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
