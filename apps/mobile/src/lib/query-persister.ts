import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { onlineManager, QueryClient } from "@tanstack/react-query";
import { persistQueryClient } from "@tanstack/react-query-persist-client";

// 1. Connect React Native NetInfo to TanStack Query Online Manager safely
try {
  if (typeof NetInfo?.addEventListener === "function") {
    onlineManager.setEventListener((setOnline) => {
      return NetInfo.addEventListener((state) => {
        setOnline(
          Boolean(state?.isConnected && state?.isInternetReachable !== false),
        );
      });
    });
  }
} catch {
  // Safe ignore if native NetInfo is unavailable
}

// In-memory fallback map for environments where AsyncStorage native module is null
const memoryFallback = new Map<string, string>();

const safeStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      if (typeof AsyncStorage?.getItem === "function") {
        return await AsyncStorage.getItem(key);
      }
    } catch {
      // ignore
    }
    return memoryFallback.get(key) ?? null;
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      if (typeof AsyncStorage?.setItem === "function") {
        await AsyncStorage.setItem(key, value);
        return;
      }
    } catch {
      // ignore
    }
    memoryFallback.set(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      if (typeof AsyncStorage?.removeItem === "function") {
        await AsyncStorage.removeItem(key);
        return;
      }
    } catch {
      // ignore
    }
    memoryFallback.delete(key);
  },
};

// 2. Create the persister with safe storage for offline data retention
export const asyncStoragePersister = createAsyncStoragePersister({
  storage: safeStorage,
  key: "POCKETLY_QUERY_OFFLINE_CACHE",
  throttleTime: 1000,
});

// 3. Configure QueryClient with offline-friendly cache retention and retry behaviors
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days in memory / local storage
      staleTime: 1000 * 60 * 5, // 5 minutes fresh
      retry: (failureCount, error) => {
        // Don't retry auth errors (401/403)
        if (
          error instanceof Error &&
          (error.message.includes("401") || error.message.includes("403"))
        ) {
          return false;
        }
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
  },
});

// 4. Initialize client persistence automatically
try {
  persistQueryClient({
    queryClient,
    persister: asyncStoragePersister,
    maxAge: 1000 * 60 * 60 * 24 * 7,
  });
} catch {
  // Safe ignore in headless/test environments
}
