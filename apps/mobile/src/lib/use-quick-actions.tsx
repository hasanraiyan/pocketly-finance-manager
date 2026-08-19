import React, { useEffect } from "react";
import * as QuickActions from "expo-quick-actions";
import { router } from "expo-router";
import { Platform } from "react-native";
import { FlexWidget, TextWidget, type WidgetTaskHandlerProps } from "react-native-android-widget";
import { formatCurrency } from "./format";
import { getLocalAccounts, getLocalTransactions } from "./local-storage-adapter";
import { createPocketlyClient } from "@pocketly/sdk";
import { getBaseUrl } from "./auth-provider";
import {
  decodeAccessToken,
  getRefreshToken,
  isExpired,
} from "./auth-tokens";

export function useQuickActionsSetup() {
  useEffect(() => {
    // 1. Define initial dynamic quick actions (long press on app icon)
    QuickActions.setItems([
      {
        id: "quick_expense",
        title: "Log Expense",
        subtitle: "Quickly record a new expense",
        icon: Platform.select({
          ios: "symbol:plus.circle.fill",
          android: "quick_expense_icon",
          default: undefined,
        }),
        params: { href: "/(app)/records?action=add&type=expense" },
      },
      {
        id: "quick_income",
        title: "Add Income",
        subtitle: "Record received money",
        icon: Platform.select({
          ios: "symbol:arrow.down.circle.fill",
          android: "quick_income_icon",
          default: undefined,
        }),
        params: { href: "/(app)/records?action=add&type=income" },
      },
    ]);

    // 2. Handle cold start shortcut if app was opened via quick action
    if (QuickActions.initial) {
      const initialHref = QuickActions.initial.params?.href as string | undefined;
      if (initialHref) {
        setTimeout(() => {
          router.push(initialHref as any);
        }, 300);
      }
    }

    // 3. Listen for dynamic quick action launches while app is running/backgrounded
    const subscription = QuickActions.addListener((action) => {
      const href = action.params?.href as string | undefined;
      if (href) {
        router.push(href as any);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);
}

export function QuickActionWidget() {
  return (
    <FlexWidget
      style={{
        height: "match_parent",
        width: "match_parent",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#faf6ed",
        borderRadius: 20,
        padding: 12,
      }}
    >
      <FlexWidget
        clickAction="OPEN_URI"
        clickActionData={{ uri: "pocketly://(app)/dashboard" }}
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: "#193b24",
          borderRadius: 14,
          paddingHorizontal: 12,
          paddingVertical: 10,
        }}
      >
        <TextWidget
          text="Pocketly"
          style={{
            fontSize: 14,
            fontWeight: "bold",
            color: "#f9f5eb",
          }}
        />
      </FlexWidget>

      <FlexWidget style={{ flexDirection: "row", alignItems: "center" }}>
        <FlexWidget
          clickAction="OPEN_URI"
          clickActionData={{ uri: "pocketly://(app)/records?action=add&type=expense" }}
          style={{
            backgroundColor: "#f43f5e",
            borderRadius: 14,
            paddingHorizontal: 12,
            paddingVertical: 10,
            marginRight: 8,
          }}
        >
          <TextWidget
            text="- Expense"
            style={{
              fontSize: 13,
              fontWeight: "bold",
              color: "#ffffff",
            }}
          />
        </FlexWidget>

        <FlexWidget
          clickAction="OPEN_URI"
          clickActionData={{ uri: "pocketly://(app)/records?action=add&type=income" }}
          style={{
            backgroundColor: "#10b981",
            borderRadius: 14,
            paddingHorizontal: 12,
            paddingVertical: 10,
          }}
        >
          <TextWidget
            text="+ Income"
            style={{
              fontSize: 13,
              fontWeight: "bold",
              color: "#ffffff",
            }}
          />
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}

export function BalancePulseWidget({
  balanceFormatted = "₹0.00",
  monthlySpentFormatted = "₹0.00",
}: {
  balanceFormatted?: string;
  monthlySpentFormatted?: string;
}) {
  return (
    <FlexWidget
      style={{
        height: "match_parent",
        width: "match_parent",
        flexDirection: "column",
        justifyContent: "space-between",
        backgroundColor: "#faf6ed",
        borderRadius: 24,
        padding: 16,
      }}
    >
      <FlexWidget
        clickAction="OPEN_URI"
        clickActionData={{ uri: "pocketly://(app)/dashboard" }}
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <FlexWidget style={{ flexDirection: "column" }}>
          <TextWidget
            text="Total Net Worth"
            style={{
              fontSize: 11,
              fontWeight: "bold",
              color: "#6b6254",
            }}
          />
          <TextWidget
            text={balanceFormatted}
            style={{
              fontSize: 22,
              fontWeight: "bold",
              color: "#193b24",
            }}
          />
        </FlexWidget>

        <FlexWidget style={{ flexDirection: "column", alignItems: "flex-end" }}>
          <TextWidget
            text="This Month"
            style={{
              fontSize: 11,
              color: "#6b6254",
            }}
          />
          <TextWidget
            text={monthlySpentFormatted}
            style={{
              fontSize: 14,
              fontWeight: "bold",
              color: "#b54b19",
            }}
          />
        </FlexWidget>
      </FlexWidget>

      <FlexWidget
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 12,
        }}
      >
        <FlexWidget
          clickAction="OPEN_URI"
          clickActionData={{ uri: "pocketly://(app)/records?action=add&type=expense" }}
          style={{
            flex: 1,
            backgroundColor: "#f43f5e",
            borderRadius: 14,
            paddingVertical: 10,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 6,
          }}
        >
          <TextWidget
            text="- Log Expense"
            style={{
              fontSize: 13,
              fontWeight: "bold",
              color: "#ffffff",
            }}
          />
        </FlexWidget>

        <FlexWidget
          clickAction="OPEN_URI"
          clickActionData={{ uri: "pocketly://(app)/records?action=add&type=income" }}
          style={{
            flex: 1,
            backgroundColor: "#10b981",
            borderRadius: 14,
            paddingVertical: 10,
            alignItems: "center",
            justifyContent: "center",
            marginLeft: 6,
          }}
        >
          <TextWidget
            text="+ Add Income"
            style={{
              fontSize: 13,
              fontWeight: "bold",
              color: "#ffffff",
            }}
          />
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}

/**
 * Fetch widget data for BalancePulseWidget.
 * - Authenticated users: tries to get a fresh access token (silent refresh from
 *   stored refresh token), then calls the real API for live account balances and
 *   this-month's expense total.
 * - Guest / unauthenticated users: reads from local SQLite as before.
 */
async function fetchWidgetData(): Promise<{
  totalBalance: number;
  monthlySpent: number;
  currency: string;
}> {
  let totalBalance = 0;
  let monthlySpent = 0;
  let currency = "INR";

  try {
    // --- 1. Try authenticated path ---
    const refreshToken = await getRefreshToken();
    if (refreshToken) {
      // Attempt silent token refresh
      const authClient = createPocketlyClient({ baseUrl: getBaseUrl() });
      const { data: refreshData, error: refreshError } = await authClient.POST("/auth/refresh", {
        body: { refreshToken },
      });

      if (!refreshError && refreshData) {
        const accessToken = refreshData.data.accessToken;
        const decoded = decodeAccessToken(accessToken);

        if (decoded && !isExpired(decoded.exp)) {
          // We have a valid token — fetch live data from the API
          const apiClient = createPocketlyClient({
            baseUrl: getBaseUrl(),
            getToken: async () => accessToken,
          });

          // Fetch all accounts and sum balances
          const { data: accountsData } = await apiClient.GET("/accounts", {});
          if (accountsData?.data?.items) {
            const accounts = accountsData.data.items;
            totalBalance = accounts.reduce((sum: number, a: { balance?: number }) => sum + (a.balance ?? 0), 0);
            // Use the first account's currency as widget currency
            if (accounts[0]?.currency) {
              currency = accounts[0].currency;
            }
          }

          // Fetch this month's expenses
          const now = new Date();
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
          const { data: txData } = await apiClient.GET("/transactions", {
            params: { query: { type: "expense", from: startOfMonth } },
          });
          if (txData?.data?.items) {
            monthlySpent = txData.data.items.reduce(
              (sum: number, t: { amount?: number }) => sum + (t.amount ?? 0),
              0,
            );
          }

          return { totalBalance, monthlySpent, currency };
        }
      }
    }

    // --- 2. Fallback: local SQLite (guest / offline) ---
    const localAccounts = await getLocalAccounts();
    totalBalance = localAccounts.reduce((sum, a) => sum + (a.balance || 0), 0);

    const localTxs = await getLocalTransactions();
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    monthlySpent = localTxs
      .filter((t) => {
        const d = new Date(t.date);
        return (
          t.type === "expense" &&
          d.getMonth() === currentMonth &&
          d.getFullYear() === currentYear
        );
      })
      .reduce((sum, t) => sum + (t.amount || 0), 0);
  } catch {
    // Return zeroes on any error — widget will still render cleanly
  }

  return { totalBalance, monthlySpent, currency };
}

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const { widgetInfo, renderWidget } = props;

  switch (widgetInfo.widgetName) {
    case "QuickActionWidget":
      renderWidget(<QuickActionWidget />);
      break;

    case "BalancePulseWidget": {
      const { totalBalance, monthlySpent, currency } = await fetchWidgetData();

      renderWidget(
        <BalancePulseWidget
          balanceFormatted={formatCurrency(totalBalance, currency)}
          monthlySpentFormatted={formatCurrency(monthlySpent, currency)}
        />
      );
      break;
    }
    default:
      break;
  }
}

export async function syncAndroidWidgets() {
  if (Platform.OS !== "android") return;
  try {
    const { requestWidgetUpdate } = await import("react-native-android-widget");
    const { totalBalance, monthlySpent, currency } = await fetchWidgetData();

    await requestWidgetUpdate({
      widgetName: "BalancePulseWidget",
      renderWidget: () => (
        <BalancePulseWidget
          balanceFormatted={formatCurrency(totalBalance, currency)}
          monthlySpentFormatted={formatCurrency(monthlySpent, currency)}
        />
      ),
      widgetNotFound: () => {},
    });
  } catch {
    // Non-fatal
  }
}

