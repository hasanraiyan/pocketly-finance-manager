"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Cable,
  Camera,
  Download,
  FileSpreadsheet,
  FileText,
  KeyRound,
  Laptop,
  PenLine,
  Plus,
  Smartphone,
  Tags,
  Trash2,
  Unplug,
  X,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { useAuth } from "@/lib/auth-provider";
import {
  useExportCsv,
  useExportPdf,
  type ExportPdfInput,
} from "@/features/transactions/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/password-input";
import {
  useActiveSessions,
  useChangePassword,
  useRevokeOtherSessions,
  useRevokeSession,
} from "./security-hooks";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { ErrorState } from "@/components/error-state";
import { CategoryFormDialog } from "@/features/categories/category-form-dialog";
import {
  useCategories,
  useDeleteCategory,
  type Category,
} from "@/features/categories/hooks";
import {
  useUpdateProfile,
  useDeleteMyAccount,
  type UserProfile,
} from "./hooks";
import {
  useDisconnectOAuthClient,
  useOAuthConnections,
  type OAuthConnection,
} from "./connections-hooks";
import {
  usePushNotificationManager,
  useSendTestNotification,
} from "@/features/notifications/hooks";

const TIMEZONES =
  typeof Intl.supportedValuesOf === "function"
    ? Intl.supportedValuesOf("timeZone")
    : ["UTC"];

function initials(name?: string) {
  if (!name) return "P";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function ProfileCard({
  profile,
  currency,
  timezone,
}: {
  profile?: UserProfile;
  currency: string;
  timezone: string;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [nameValue, setNameValue] = useState(profile?.name ?? "");
  const [imageUrlValue, setImageUrlValue] = useState(profile?.imageUrl ?? "");
  const [phoneValue, setPhoneValue] = useState(profile?.phone ?? "");
  const [currencyValue, setCurrencyValue] = useState(currency);
  const [timezoneValue, setTimezoneValue] = useState(timezone);

  const updateProfile = useUpdateProfile();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("Please choose an image under 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === "string") {
        setImageUrlValue(event.target.result);
      }
    };
    reader.readAsDataURL(file);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Details & Ledger Settings</CardTitle>
        <CardDescription>
          Manage your personal avatar, identity, and regional ledger preferences.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-col gap-6"
          onSubmit={(e) => {
            e.preventDefault();
            updateProfile.mutate(
              {
                name: nameValue || undefined,
                imageUrl: imageUrlValue || undefined,
                phone: phoneValue || undefined,
                currency: currencyValue.toUpperCase(),
                timezone: timezoneValue,
              },
              {
                onSuccess: () => {
                  router.refresh();
                },
              },
            );
          }}
        >
          {/* Avatar Section */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 pb-4 border-b border-border">
            <div className="relative group">
              <Avatar className="size-16 border-2 border-border shadow-sm">
                {imageUrlValue && (
                  <AvatarImage src={imageUrlValue} alt={nameValue} />
                )}
                <AvatarFallback className="text-base font-semibold">
                  {initials(nameValue)}
                </AvatarFallback>
              </Avatar>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-foreground">
                Profile Avatar
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera className="mr-1.5 size-3.5" />
                  Change photo
                </Button>
                {imageUrlValue && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground hover:text-destructive"
                    onClick={() => setImageUrlValue("")}
                  >
                    <X className="mr-1 size-3" />
                    Remove
                  </Button>
                )}
              </div>
              <span className="text-[11px] text-muted-foreground">
                JPG, PNG, GIF or WebP up to 2MB.
              </span>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel>Display Name</FieldLabel>
              <Input
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                placeholder="Your full name"
                required
              />
            </Field>

            <Field>
              <FieldLabel>Email Address</FieldLabel>
              <Input
                value={profile?.email ?? ""}
                disabled
                className="bg-muted/50 cursor-not-allowed opacity-80"
              />
            </Field>

            <Field>
              <FieldLabel>Phone Number</FieldLabel>
              <Input
                value={phoneValue}
                onChange={(e) => setPhoneValue(e.target.value)}
                placeholder="+91 98765 43210 (optional)"
              />
            </Field>

            <Field>
              <FieldLabel>Currency</FieldLabel>
              <Input
                maxLength={3}
                className="uppercase font-mono"
                value={currencyValue}
                onChange={(e) => setCurrencyValue(e.target.value.toUpperCase())}
                placeholder="INR"
                required
              />
            </Field>

            <Field className="sm:col-span-2">
              <FieldLabel>Timezone</FieldLabel>
              <NativeSelect
                className="w-full"
                value={timezoneValue}
                onChange={(e) => setTimezoneValue(e.target.value)}
              >
                {TIMEZONES.map((tz) => (
                  <NativeSelectOption key={tz} value={tz}>
                    {tz}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
          </div>

          <div>
            <Button type="submit" disabled={updateProfile.isPending}>
              {updateProfile.isPending && (
                <Spinner className="mr-1.5 size-3.5" />
              )}
              Save changes
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function DeleteCategoryButton({ category }: { category: Category }) {
  const [open, setOpen] = useState(false);
  const deleteCategory = useDeleteCategory();

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button variant="ghost" size="icon-sm" />}>
        <Trash2 />
        <span className="sr-only">Delete {category.name}</span>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {category.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            Records already using this category keep it, but you
            won&apos;t be able to pick it for new ones.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => {
              setOpen(false);
              deleteCategory.mutate(category._id);
            }}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function CategoryList({
  title,
  categories,
  type,
}: {
  title: string;
  categories: Category[];
  type: Category["type"];
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
        <CategoryFormDialog
          defaultType={type}
          trigger={
            <Button variant="ghost" size="sm">
              <Plus />
              Add
            </Button>
          }
        />
      </div>
      {categories.length === 0 ? (
        <p className="py-2 text-sm text-muted-foreground">
          No {title.toLowerCase()} yet.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {categories.map((category) => (
            <li
              key={category._id}
              className="flex items-center justify-between py-2"
            >
              <span className="text-sm text-foreground">{category.name}</span>
              <div className="flex gap-1">
                <CategoryFormDialog
                  category={category}
                  trigger={
                    <Button variant="ghost" size="icon-sm">
                      <PenLine />
                      <span className="sr-only">Edit {category.name}</span>
                    </Button>
                  }
                />
                <DeleteCategoryButton category={category} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CategoriesCard({
  initialData,
  initialLoadFailed = false,
}: {
  initialData: Category[];
  initialLoadFailed?: boolean;
}) {
  const { data: categories, isError, isFetching, refetch } =
    useCategories(initialData);
  const showError = initialLoadFailed || isError;
  const income = useMemo(
    () => categories.filter((c) => c.type === "income"),
    [categories],
  );
  const expense = useMemo(
    () => categories.filter((c) => c.type === "expense"),
    [categories],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Categories</CardTitle>
        <CardDescription>
          Organize your income and expenses so budgets and analysis mean
          something.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {showError ? (
          <ErrorState
            title="Couldn't load your categories"
            onRetry={() => refetch()}
            retrying={isFetching}
          />
        ) : categories.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Tags />
              </EmptyMedia>
              <EmptyTitle>No categories yet</EmptyTitle>
              <EmptyDescription>
                Add a category to start organizing your records.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2">
            <CategoryList title="Expense" categories={expense} type="expense" />
            <CategoryList title="Income" categories={income} type="income" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const SCOPE_LABELS: Record<string, string> = {
  "pocketly:read": "View your data",
  "pocketly:write": "Create, edit, and delete on your behalf",
  openid: "Confirm your identity",
  profile: "Read your name",
  email: "Read your email address",
  offline_access: "Stay connected between sessions",
};

function DisconnectAppButton({ connection }: { connection: OAuthConnection }) {
  const [open, setOpen] = useState(false);
  const disconnect = useDisconnectOAuthClient();

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button variant="ghost" size="icon-sm" />}>
        <Unplug />
        <span className="sr-only">Disconnect {connection.clientName}</span>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Disconnect {connection.clientName}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            It loses access immediately and won&apos;t be able to reconnect
            without going through consent again.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => {
              setOpen(false);
              disconnect.mutate({
                id: connection.id,
                clientId: connection.clientId,
              });
            }}
          >
            Disconnect
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function ConnectedAppsCard() {
  const { data: connections, isError, isFetching, refetch } =
    useOAuthConnections();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Connected apps</CardTitle>
        <CardDescription>
          AI tools and other apps you&apos;ve given access to your Pocketly
          data via MCP.
        </CardDescription>
        <CardAction>
          <Button
            variant="outline"
            size="sm"
            render={<Link href="/mcp-guide" />}
          >
            Connect a client
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {isError ? (
          <ErrorState
            title="Couldn't load your connected apps"
            onRetry={() => refetch()}
            retrying={isFetching}
          />
        ) : !connections || connections.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Cable />
              </EmptyMedia>
              <EmptyTitle>Nothing connected yet</EmptyTitle>
              <EmptyDescription>
                Connect an MCP client (like Claude) to your Pocketly data to
                see it here.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ul className="divide-y divide-border">
            {connections.map((connection) => (
              <li
                key={connection.id}
                className="flex items-center justify-between gap-3 py-3"
              >
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm text-foreground">
                    {connection.clientName}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {connection.scopes
                      .map((scope) => SCOPE_LABELS[scope])
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </div>
                <DisconnectAppButton connection={connection} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function DangerZoneCard() {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const deleteAccount = useDeleteMyAccount();
  const { logout } = useAuth();
  const router = useRouter();

  async function handleDelete() {
    await deleteAccount.mutateAsync();
    // The account is already gone server-side at this point, so this is
    // just clearing the now-dead session locally.
    await logout().catch(() => {});
    router.push("/");
  }

  return (
    <Card className="border-destructive/30">
      <CardHeader>
        <CardTitle>Danger zone</CardTitle>
        <CardDescription>
          Permanently delete your account and every account, record, and
          budget in it. This can&apos;t be undone.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AlertDialog open={open} onOpenChange={setOpen}>
          <AlertDialogTrigger render={<Button variant="destructive" />}>
            Delete my account
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Delete your Pocketly account?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This permanently deletes your accounts, records, budgets,
                and categories. Type DELETE to confirm.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE"
              className="mt-1"
            />
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setConfirmText("")}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                disabled={confirmText !== "DELETE" || deleteAccount.isPending}
                onClick={handleDelete}
              >
                {deleteAccount.isPending && <Spinner className="size-3.5" />}
                Delete permanently
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}

function NotificationsCard() {
  const {
    permissionStatus,
    isRegistering,
    isDeviceRegistered,
    enablePushNotifications,
    disablePushNotifications,
  } = usePushNotificationManager();
  const sendTest = useSendTestNotification();

  const isEnabled = permissionStatus === "granted" && isDeviceRegistered;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="size-4" />
          Notifications & Reminders
        </CardTitle>
        <CardDescription>
          Get real-time budget warnings and daily reminders to stay on top of your money.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-border p-3">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-foreground">
              Instant alerts & reminders
            </span>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              Status:{" "}
              {isEnabled ? (
                <span className="font-medium text-emerald-600 dark:text-emerald-400">
                  Enabled on this device
                </span>
              ) : permissionStatus === "denied" ? (
                <span className="font-medium text-destructive">
                  Blocked in browser settings
                </span>
              ) : (
                <span className="font-medium text-amber-600 dark:text-amber-400">
                  Not enabled
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!isEnabled ? (
              <Button
                variant="default"
                size="sm"
                onClick={enablePushNotifications}
                disabled={isRegistering || permissionStatus === "denied"}
              >
                {isRegistering ? (
                  <Spinner className="mr-1.5 size-3.5" />
                ) : (
                  <Bell className="mr-1.5 size-3.5" />
                )}
                Enable notifications
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => sendTest.mutate()}
                  disabled={sendTest.isPending}
                >
                  {sendTest.isPending ? (
                    <Spinner className="mr-1.5 size-3.5" />
                  ) : (
                    <Bell className="mr-1.5 size-3.5" />
                  )}
                  Send test reminder
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground hover:text-destructive"
                  onClick={disablePushNotifications}
                  disabled={isRegistering}
                >
                  Disable
                </Button>
              </>
            )}
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground">
          Works seamlessly on desktop and mobile even when Pocketly is closed.
        </p>
      </CardContent>
    </Card>
  );
}

function ExportDataCard() {
  const [period, setPeriod] = useState<ExportPdfInput["period"]>("all_time");
  const exportPdf = useExportPdf();
  const exportCsv = useExportCsv();

  const isPending = exportPdf.isPending || exportCsv.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="size-4" />
          Export Financial Data
        </CardTitle>
        <CardDescription>
          Download your complete financial history in CSV spreadsheet format (for Excel / Google Sheets) or as a styled PDF statement.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-border p-3">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-foreground">
              Export timeframe
            </span>
            <div className="w-48">
              <NativeSelect
                value={period}
                onChange={(e) =>
                  setPeriod(e.target.value as ExportPdfInput["period"])
                }
                disabled={isPending}
              >
                <NativeSelectOption value="all_time">All time</NativeSelectOption>
                <NativeSelectOption value="this_year">This year</NativeSelectOption>
                <NativeSelectOption value="6m">Last 6 months</NativeSelectOption>
                <NativeSelectOption value="3m">Last 3 months</NativeSelectOption>
                <NativeSelectOption value="this_month">This month</NativeSelectOption>
                <NativeSelectOption value="last_month">Last month</NativeSelectOption>
              </NativeSelect>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportCsv.mutate({ period })}
              disabled={isPending}
            >
              {exportCsv.isPending ? (
                <Spinner className="mr-1.5 size-3.5" />
              ) : (
                <FileSpreadsheet className="mr-1.5 size-3.5" />
              )}
              {exportCsv.isPending ? "Queuing…" : "Export CSV"}
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => exportPdf.mutate({ period })}
              disabled={isPending}
            >
              {exportPdf.isPending ? (
                <Spinner className="mr-1.5 size-3.5" />
              ) : (
                <FileText className="mr-1.5 size-3.5" />
              )}
              {exportPdf.isPending ? "Queuing…" : "Export PDF"}
            </Button>
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground">
          📧 Reports are processed securely via background workers and delivered directly to your registered email with the file attached.
        </p>
      </CardContent>
    </Card>
  );
}

function SecurityPasswordCard() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const changePasswordMutation = useChangePassword();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setValidationError(null);

    if (!currentPassword) {
      setValidationError("Enter your current password.");
      return;
    }
    if (newPassword.length < 8) {
      setValidationError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setValidationError("New passwords do not match.");
      return;
    }

    changePasswordMutation.mutate(
      {
        currentPassword,
        newPassword,
      },
      {
        onSuccess: () => {
          setCurrentPassword("");
          setNewPassword("");
          setConfirmPassword("");
        },
      },
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="size-4" />
          Security & Password
        </CardTitle>
        <CardDescription>
          Update your password to keep your financial ledger secure.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field>
              <FieldLabel htmlFor="current-password">Current password</FieldLabel>
              <PasswordInput
                id="current-password"
                value={currentPassword}
                onChange={setCurrentPassword}
                placeholder="Current password"
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="new-password">New password</FieldLabel>
              <PasswordInput
                id="new-password"
                value={newPassword}
                onChange={setNewPassword}
                placeholder="At least 8 characters"
                minLength={8}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="confirm-password">Confirm new password</FieldLabel>
              <PasswordInput
                id="confirm-password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder="Repeat new password"
                minLength={8}
                required
              />
            </Field>
          </div>

          {validationError && (
            <p className="text-xs text-destructive">{validationError}</p>
          )}

          <div>
            <Button
              type="submit"
              disabled={changePasswordMutation.isPending || !newPassword}
            >
              {changePasswordMutation.isPending && (
                <Spinner className="mr-1.5 size-3.5" />
              )}
              Update password
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function ActiveSessionsCard() {
  const { data: sessions = [], isLoading, isError } = useActiveSessions();
  const revokeSession = useRevokeSession();
  const revokeOthers = useRevokeOtherSessions();

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Laptop className="size-4" />
              Active Sessions & Devices
            </CardTitle>
            <CardDescription>
              Manage devices and browsers currently signed in to your account.
            </CardDescription>
          </div>
          {sessions.length > 1 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => revokeOthers.mutate()}
              disabled={revokeOthers.isPending}
            >
              {revokeOthers.isPending && (
                <Spinner className="mr-1.5 size-3.5" />
              )}
              Sign out all other devices
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Spinner className="size-6 text-muted-foreground" />
          </div>
        ) : isError ? (
          <p className="text-xs text-muted-foreground py-2">
            Failed to load active sessions.
          </p>
        ) : sessions.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">
            No active sessions found.
          </p>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-md border border-border bg-muted/30">
                    {session.userAgent?.toLowerCase().includes("mobile") ? (
                      <Smartphone className="size-4 text-muted-foreground" />
                    ) : (
                      <Laptop className="size-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-foreground">
                        {session.userAgent?.split(" ")[0] || "Web Browser"}
                      </span>
                      {session.isCurrent && (
                        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                          Current session
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      {session.ipAddress ? `IP: ${session.ipAddress} • ` : ""}
                      Created: {new Date(session.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {!session.isCurrent && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground hover:text-destructive"
                    onClick={() => revokeSession.mutate({ sessionId: session.id })}
                    disabled={revokeSession.isPending}
                  >
                    Revoke
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function SettingsView({
  profile,
  currency,
  timezone,
  profileLoadFailed = false,
  categoriesInitialData,
  categoriesLoadFailed = false,
}: {
  profile?: UserProfile;
  currency: string;
  timezone: string;
  profileLoadFailed?: boolean;
  categoriesInitialData: Category[];
  categoriesLoadFailed?: boolean;
}) {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Your profile, categories, and account.
        </p>
      </div>
      {profileLoadFailed ? (
        <ErrorState
          title="Couldn't load your profile"
          description="We couldn't confirm your saved currency and timezone, so editing is disabled for now to avoid overwriting them with the wrong values."
          onRetry={() => router.refresh()}
        />
      ) : (
        <ProfileCard profile={profile} currency={currency} timezone={timezone} />
      )}
      <CategoriesCard
        initialData={categoriesInitialData}
        initialLoadFailed={categoriesLoadFailed}
      />
      <SecurityPasswordCard />
      <ActiveSessionsCard />
      <ExportDataCard />
      <NotificationsCard />
      <ConnectedAppsCard />
      <DangerZoneCard />
    </div>
  );
}
