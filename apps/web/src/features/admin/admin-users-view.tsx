"use client";

import { useState } from "react";
import { Search, Shield, ShieldCheck } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Spinner } from "@/components/ui/spinner";
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
  useLoadMoreAdminUsers,
} from "./hooks";

export function AdminUsersView() {
  const [search, setSearch] = useState("");
  const [userToPromote, setUserToPromote] = useState<{
    id: string;
    email: string;
    currentRole: "user" | "admin";
  } | null>(null);

  const filters = { search: search.trim() || undefined };
  const { data, isLoading } = useAdminUsers(filters);
  const { data: currentUser } = useUserProfile();
  const loadMore = useLoadMoreAdminUsers(filters);
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
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-xs text-muted-foreground">
              No users found matching your search.
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((user) => {
                    const isAdmin = user.role === "admin";
                    const isSelf = user._id === currentUser?._id;
                    return (
                      <TableRow key={user._id}>
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <Avatar className="size-7 shrink-0">
                              <AvatarFallback className="text-2xs">
                                {user.name ? user.name[0].toUpperCase() : "U"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="truncate font-medium text-foreground">
                                {user.name}
                              </div>
                              <div className="truncate text-2xs text-muted-foreground">
                                {user.email}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={isAdmin ? "default" : "outline"}
                            className="text-2xs uppercase tracking-wider"
                          >
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {formatDate(user.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          {isSelf ? (
                            <Badge variant="outline" className="text-2xs">
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
                              className="h-8 gap-1.5 text-xs"
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
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {data?.nextCursor && (
                <div className="flex justify-center pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadMore.mutate(data.nextCursor as string)}
                    disabled={loadMore.isPending}
                    className="gap-1.5 text-xs"
                  >
                    {loadMore.isPending && <Spinner className="size-3.5" />}
                    Load more
                  </Button>
                </div>
              )}
            </>
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
