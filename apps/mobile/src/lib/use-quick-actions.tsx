import { useEffect } from "react";
import * as QuickActions from "expo-quick-actions";
import { router } from "expo-router";
import { Platform } from "react-native";

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


