"use client";

import { useState } from "react";
import { Search, Shield, ShieldCheck, Mail, Calendar } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";
import { useUserProfile } from "@/features/settings/hooks";
import {
  useAdminUsers,
  useAdminUpdateUserRole,
} from "./hooks";

export function AdminUsersView() {
  const [search, setSearch] = useState("");
  const [userToPromote, setUserToPromote] = useState<{
    id: string;
    email: string;
    currentRole: "user" | "admin";
  } | null>(null);

  const { data, isLoading } = useAdminUsers({ search: search.trim() || undefined });
  const { data: currentUser } = useUserProfile();
  const updateRoleMutation = useAdminUpdateUserRole();
  const items = data?.items ?? [];

  const handleToggleRole = async () => {
    if (!userToPromote) return;
    const targetRole = userToPromote.currentRole === "admin" ? "user" : "admin";
    await updateRoleMutation.mutateAsync({
      id: userToPromote.id,
      role: targetRole,
    });
    setUserToPromote(null);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-semibold">
                User Directory & Role Management
              </CardTitle>
              <CardDescription className="text-xs">
                Inspect registered users and manage administrative authorizations
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Search user name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9 text-xs"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-xs text-muted-foreground">
              No users found matching your search.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {items.map((user) => {
                const isAdmin = user.role === "admin";
                const isSelf = user._id === currentUser?._id;
                return (
                  <div
                    key={user._id}
                    className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-full bg-muted flex items-center justify-center font-semibold text-muted-foreground shrink-0">
                        {user.name ? user.name[0].toUpperCase() : "U"}
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">{user.name}</span>
                          <Badge
                            variant={isAdmin ? "default" : "outline"}
                            className="text-2xs uppercase tracking-wider"
                          >
                            {user.role}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-2xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Mail className="size-3" />
                            {user.email}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="size-3" />
                            Joined {formatDate(user.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {isSelf ? (
                      <Badge
                        variant="outline"
                        className="text-2xs self-end sm:self-auto"
                      >
                        This is you
                      </Badge>
                    ) : (
                      <Button
                        variant={isAdmin ? "outline" : "secondary"}
                        size="sm"
                        onClick={() =>
                          setUserToPromote({
                            id: user._id,
                            email: user.email,
                            currentRole: user.role,
                          })
                        }
                        className="h-8 gap-1.5 text-xs self-end sm:self-auto"
                      >
                        {isAdmin ? (
                          <>
                            <Shield className="size-3 text-muted-foreground" />
                            <span>Demote to User</span>
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="size-3 text-primary" />
                            <span>Promote to Admin</span>
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      {userToPromote && (
        <AlertDialog
          open={Boolean(userToPromote)}
          onOpenChange={(open) => !open && setUserToPromote(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {userToPromote.currentRole === "admin"
                  ? "Demote administrator?"
                  : "Grant administrator privileges?"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {userToPromote.currentRole === "admin"
                  ? `Are you sure you want to remove administrator access from ${userToPromote.email}? They will no longer be able to access the admin operations dashboard.`
                  : `Are you sure you want to grant full administrator access to ${userToPromote.email}? They will gain access to platform-wide analytics, feedback management, and user controls.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleToggleRole}>
                Confirm
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
