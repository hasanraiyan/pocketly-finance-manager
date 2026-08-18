import NetInfo from "@react-native-community/netinfo";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { onlineManager, QueryClient } from "@tanstack/react-query";
import { persistQueryClient } from "@tanstack/react-query-persist-client";
import { safeStorage } from "./safe-storage";

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

// 2. Create the persister using safe Expo SecureStore storage
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
