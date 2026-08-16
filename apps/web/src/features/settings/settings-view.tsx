"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Cable, PenLine, Plus, Tags, Trash2, Unplug } from "lucide-react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { clearStoredAuthToken } from "@/lib/auth-token";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useUpdateProfile, useDeleteMyAccount } from "./hooks";
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

function ProfileCard({
  currency,
  timezone,
}: {
  currency: string;
  timezone: string;
}) {
  const [currencyValue, setCurrencyValue] = useState(currency);
  const [timezoneValue, setTimezoneValue] = useState(timezone);
  const updateProfile = useUpdateProfile();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>
          Your currency and timezone shape every amount and date you see.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            updateProfile.mutate({
              currency: currencyValue.toUpperCase(),
              timezone: timezoneValue,
            });
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel>Currency</FieldLabel>
              <Input
                maxLength={3}
                className="uppercase"
                value={currencyValue}
                onChange={(e) => setCurrencyValue(e.target.value.toUpperCase())}
              />
            </Field>
            <Field>
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
              {updateProfile.isPending && <Spinner className="size-3.5" />}
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
  const router = useRouter();

  async function handleDelete() {
    await deleteAccount.mutateAsync();
    // The account (and its Better Auth identity) is already gone server-side
    // at this point, so this call is just best-effort local cleanup.
    await authClient.signOut().catch(() => {});
    clearStoredAuthToken();
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
  const { permissionStatus, isRegistering, enablePushNotifications } =
    usePushNotificationManager();
  const sendTest = useSendTestNotification();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="size-4" />
          Push Notifications & Devices
        </CardTitle>
        <CardDescription>
          Receive real-time budget threshold warnings and daily streak reminders even when the website is closed.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-border p-3">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-foreground">
              Browser Push (FCM)
            </span>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              Status:{" "}
              {permissionStatus === "granted" ? (
                <span className="font-medium text-emerald-600 dark:text-emerald-400">
                  Active & Connected (Granted)
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
          <div className="flex items-center gap-2">
            {permissionStatus !== "granted" ? (
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
                Enable on this device
              </Button>
            ) : (
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
                Send Test Alert
              </Button>
            )}
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground">
          📱 <strong>Mobile App Sync:</strong> Connecting this web browser registers an FCM device token. When you log in with the upcoming Android / iOS app, your notifications will automatically sync across all your devices.
        </p>
      </CardContent>
    </Card>
  );
}

export function SettingsView({
  currency,
  timezone,
  profileLoadFailed = false,
  categoriesInitialData,
  categoriesLoadFailed = false,
}: {
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
        <ProfileCard currency={currency} timezone={timezone} />
      )}
      <CategoriesCard
        initialData={categoriesInitialData}
        initialLoadFailed={categoriesLoadFailed}
      />
      <NotificationsCard />
      <ConnectedAppsCard />
      <DangerZoneCard />
    </div>
  );
}
