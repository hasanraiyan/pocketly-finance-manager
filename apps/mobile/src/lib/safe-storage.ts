import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// In-memory fallback
const memoryStore = new Map<string, string>();

export const safeStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      if (Platform.OS === "web") {
        if (typeof localStorage !== "undefined") {
          return localStorage.getItem(key);
        }
        return memoryStore.get(key) ?? null;
      }
      return await SecureStore.getItemAsync(key);
    } catch {
      return memoryStore.get(key) ?? null;
    }
  },

  setItem: async (key: string, value: string): Promise<void> => {
    try {
      if (Platform.OS === "web") {
        if (typeof localStorage !== "undefined") {
          localStorage.setItem(key, value);
          return;
        }
        memoryStore.set(key, value);
        return;
      }
      await SecureStore.setItemAsync(key, value);
    } catch {
      memoryStore.set(key, value);
    }
  },

  removeItem: async (key: string): Promise<void> => {
    try {
      if (Platform.OS === "web") {
        if (typeof localStorage !== "undefined") {
          localStorage.removeItem(key);
          return;
        }
        memoryStore.delete(key);
        return;
      }
      await SecureStore.deleteItemAsync(key);
    } catch {
      memoryStore.delete(key);
    }
  },
};
