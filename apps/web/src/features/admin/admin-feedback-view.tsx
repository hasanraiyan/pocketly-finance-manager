"use client";

import { useState } from "react";
import {
  Search,
  Trash2,
  Edit,
  Star,
  User,
  Mail,
  Loader2,
} from "lucide-react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  useAdminFeedbackList,
  useAdminUpdateFeedback,
  useAdminDeleteFeedback,
  type AdminFeedbackItem,
} from "./hooks";

const STATUSES: { id: AdminFeedbackItem["status"]; label: string; tone: string }[] = [
  { id: "submitted", label: "Submitted", tone: "bg-muted text-muted-foreground" },
  { id: "under_review", label: "Under Review", tone: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  { id: "planned", label: "Planned", tone: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
  { id: "in_progress", label: "In Progress", tone: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" },
  { id: "shipped", label: "Shipped", tone: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  { id: "rejected", label: "Declined", tone: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20" },
];

const CATEGORIES: { id: AdminFeedbackItem["category"] | "all"; label: string }[] = [
  { id: "all", label: "All Categories" },
  { id: "feature_request", label: "Feature Idea" },
  { id: "bug", label: "Bug Report" },
  { id: "ux_ui", label: "UX / UI" },
  { id: "financial_intelligence", label: "Intelligence" },
  { id: "mcp", label: "MCP AI" },
  { id: "general", label: "General" },
  { id: "other", label: "Other" },
];

export function AdminFeedbackView() {
  const [category, setCategory] = useState<AdminFeedbackItem["category"] | "all">("all");
  const [status, setStatus] = useState<AdminFeedbackItem["status"] | "all">("all");
  const [search, setSearch] = useState("");

  const [selectedItem, setSelectedItem] = useState<AdminFeedbackItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<AdminFeedbackItem | null>(null);

  // Edit form state
  const [editStatus, setEditStatus] = useState<AdminFeedbackItem["status"]>("submitted");
  const [editInternalNotes, setEditInternalNotes] = useState("");
  const [editAdminResponse, setEditAdminResponse] = useState("");

  const updateMutation = useAdminUpdateFeedback();
  const deleteMutation = useAdminDeleteFeedback();

  const { data, isLoading } = useAdminFeedbackList({
    category: category === "all" ? undefined : category,
    status: status === "all" ? undefined : status,
    search: search.trim() || undefined,
  });

  const items = data?.items ?? [];

  const handleOpenEdit = (item: AdminFeedbackItem) => {
    setSelectedItem(item);
    setEditStatus(item.status);
    setEditInternalNotes(item.internalNotes || "");
    setEditAdminResponse(item.adminResponse || "");
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    await updateMutation.mutateAsync({
      id: selectedItem._id,
      input: {
        status: editStatus,
        internalNotes: editInternalNotes.trim() || undefined,
        adminResponse: editAdminResponse.trim() || undefined,
      },
    });

    setSelectedItem(null);
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    await deleteMutation.mutateAsync(itemToDelete._id);
    setItemToDelete(null);
  };

  return (
    <div className="space-y-6">
      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Search title, desc, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 text-xs"
            />
          </div>

          <Select
            value={category}
            onValueChange={(val) =>
              setCategory(val as AdminFeedbackItem["category"] | "all")
            }
          >
            <SelectTrigger className="w-[150px] h-9 text-xs">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat.id} value={cat.id} className="text-xs">
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={status}
            onValueChange={(val) =>
              setStatus(val as AdminFeedbackItem["status"] | "all")
            }
          >
            <SelectTrigger className="w-[140px] h-9 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Statuses</SelectItem>
              {STATUSES.map((st) => (
                <SelectItem key={st.id} value={st.id} className="text-xs">
                  {st.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="text-xs text-muted-foreground font-mono">
          {items.length} item{items.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Feedback Items Table / Grid */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-xs text-muted-foreground">
          No feedback or feature requests found matching the selected filters.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const statusConfig = STATUSES.find((s) => s.id === item.status) || STATUSES[0];
            return (
              <Card
                key={item._id}
                className="transition-all hover:border-border/80"
              >
                <CardContent className="p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="text-2xs font-medium uppercase tracking-wider">
                          {item.category.replace(/_/g, " ")}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={cn("text-2xs font-medium border", statusConfig.tone)}
                        >
                          {statusConfig.label}
                        </Badge>
                        <Badge variant="secondary" className="text-2xs font-mono">
                          ▲ {item.upvoteCount} vote{item.upvoteCount !== 1 ? "s" : ""}
                        </Badge>
                        {item.rating && (
                          <div className="flex items-center gap-1 text-amber-500 text-2xs font-mono">
                            <Star className="size-3 fill-amber-500" />
                            <span>{item.rating}/5</span>
                          </div>
                        )}
                        <span className="text-2xs text-muted-foreground ml-auto font-mono">
                          {formatDate(item.createdAt)}
                        </span>
                      </div>

                      <div>
                        <h4 className="font-heading text-sm font-semibold text-foreground">
                          {item.title}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-line line-clamp-2">
                          {item.description}
                        </p>
                      </div>

                      {/* User Context */}
                      <div className="flex flex-wrap items-center gap-3 text-2xs text-muted-foreground pt-1">
                        <span className="flex items-center gap-1 font-medium text-foreground/80">
                          <User className="size-3" />
                          {item.userName}
                        </span>
                        <span className="flex items-center gap-1">
                          <Mail className="size-3" />
                          {item.userEmail}
                        </span>
                        {item.pageContext && (
                          <span className="bg-muted px-1.5 py-0.5 rounded font-mono">
                            Context: {item.pageContext}
                          </span>
                        )}
                      </div>

                      {/* Team notes & response preview */}
                      {(item.internalNotes || item.adminResponse) && (
                        <div className="flex flex-col gap-1.5 pt-2">
                          {item.internalNotes && (
                            <div className="rounded border border-amber-500/20 bg-amber-500/5 p-2 text-2xs">
                              <span className="font-semibold text-amber-600 dark:text-amber-400">
                                Internal Note:{" "}
                              </span>
                              <span className="text-foreground/90">{item.internalNotes}</span>
                            </div>
                          )}
                          {item.adminResponse && (
                            <div className="rounded border border-primary/20 bg-primary/5 p-2 text-2xs">
                              <span className="font-semibold text-primary">
                                Public Response:{" "}
                              </span>
                              <span className="text-foreground/90">{item.adminResponse}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center sm:flex-col gap-2 shrink-0 self-end sm:self-start">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenEdit(item)}
                        className="h-8 gap-1.5 text-xs"
                      >
                        <Edit className="size-3.5" />
                        <span>Manage</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setItemToDelete(item)}
                        className="h-8 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit / Manage Modal */}
      {selectedItem && (
        <Dialog open={Boolean(selectedItem)} onOpenChange={(open) => !open && setSelectedItem(null)}>
          <DialogContent className="max-w-lg">
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <DialogHeader>
                <DialogTitle className="text-base font-semibold">
                  Manage Feedback Item
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Update feature request lifecycle status, add private internal notes, or write a public update.
                </DialogDescription>
              </DialogHeader>

              <div className="rounded-lg bg-muted/50 p-3 space-y-1 text-xs">
                <div className="font-semibold text-foreground">{selectedItem.title}</div>
                <p className="text-muted-foreground whitespace-pre-line line-clamp-3">
                  {selectedItem.description}
                </p>
                <div className="text-2xs text-muted-foreground pt-1 flex items-center gap-2">
                  <span>From: {selectedItem.userName} ({selectedItem.userEmail})</span>
                  <span>•</span>
                  <span>{selectedItem.upvoteCount} upvotes</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="manage-status">Lifecycle Status</Label>
                <Select
                  value={editStatus}
                  onValueChange={(val) =>
                    setEditStatus(val as AdminFeedbackItem["status"])
                  }
                >
                  <SelectTrigger id="manage-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((st) => (
                      <SelectItem key={st.id} value={st.id}>
                        {st.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="internal-notes">Internal Team Notes</Label>
                  <span className="text-2xs text-amber-600 dark:text-amber-400 font-medium">
                    Admin only (never visible to users)
                  </span>
                </div>
                <Textarea
                  id="internal-notes"
                  placeholder="e.g. Discussed in sprint planning, assigned to frontend team..."
                  rows={3}
                  value={editInternalNotes}
                  onChange={(e) => setEditInternalNotes(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="admin-response">Public Team Response</Label>
                  <span className="text-2xs text-primary font-medium">
                    Visible to all users on roadmap
                  </span>
                </div>
                <Textarea
                  id="admin-response"
                  placeholder="e.g. We have begun rolling this out in the latest release! Enjoy."
                  rows={3}
                  value={editAdminResponse}
                  onChange={(e) => setEditAdminResponse(e.target.value)}
                />
              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setSelectedItem(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Alert */}
      {itemToDelete && (
        <AlertDialog open={Boolean(itemToDelete)} onOpenChange={(open) => !open && setItemToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete feedback item?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete &quot;{itemToDelete.title}&quot;? This action is audited and cannot be undone.
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
      )}
    </div>
  );
}
