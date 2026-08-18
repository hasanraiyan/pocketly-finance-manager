import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { onlineManager, QueryClient } from "@tanstack/react-query";

// 1. Connect React Native NetInfo to TanStack Query Online Manager
onlineManager.setEventListener((setOnline) => {
  return NetInfo.addEventListener((state) => {
    setOnline(Boolean(state.isConnected && state.isInternetReachable !== false));
  });
});

// 2. Create the AsyncStorage persister for 7-day offline data retention
export const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
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
