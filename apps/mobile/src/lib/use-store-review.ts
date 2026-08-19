import * as StoreReview from "expo-store-review";
import { Platform } from "react-native";
import { safeStorage } from "@/lib/safe-storage";

const REVIEW_ACTION_COUNT_KEY = "POCKETLY_ACTION_COUNT_FOR_REVIEW";
const LAST_REVIEW_PROMPT_KEY = "POCKETLY_LAST_REVIEW_PROMPT_TIME";
const THRESHOLD_ACTIONS = 5;
const COOLDOWN_DAYS = 60;

export async function recordPositiveActionAndCheckReview(): Promise<void> {
  if (Platform.OS === "web") return;

  try {
    const isAvailable = await StoreReview.isAvailableAsync();
    if (!isAvailable) return;

    // Check cooldown
    const lastPromptStr = await safeStorage.getItem(LAST_REVIEW_PROMPT_KEY);
    if (lastPromptStr) {
      const lastPromptTime = parseInt(lastPromptStr, 10);
      const daysSince = (Date.now() - lastPromptTime) / (1000 * 60 * 60 * 24);
      if (daysSince < COOLDOWN_DAYS) return;
    }

    // Increment count
    const currentCountStr = await safeStorage.getItem(REVIEW_ACTION_COUNT_KEY);
    const count = (currentCountStr ? parseInt(currentCountStr, 10) : 0) + 1;
    await safeStorage.setItem(REVIEW_ACTION_COUNT_KEY, count.toString());

    // Prompt if threshold reached
    if (count >= THRESHOLD_ACTIONS) {
      const hasAction = await StoreReview.hasAction();
      if (hasAction) {
        await StoreReview.requestReview();
        await safeStorage.setItem(LAST_REVIEW_PROMPT_KEY, Date.now().toString());
        await safeStorage.setItem(REVIEW_ACTION_COUNT_KEY, "0");
      }
    }
  } catch {
    // Fail silently
  }
}
