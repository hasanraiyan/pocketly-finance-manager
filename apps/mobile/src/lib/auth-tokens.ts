import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export const REFRESH_TOKEN_STORAGE_KEY = "pocketly_refresh_token";

/** Seconds of slack before the real expiry -- refresh a little early rather than racing a request against it. */
const EXPIRY_SKEW_SECONDS = 30;

export interface DecodedAccessToken {
  sub: string;
  sid?: string;
  exp: number;
}

export async function saveRefreshToken(token: string): Promise<void> {
  if (Platform.OS === "web") {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, token);
    }
    return;
  }
  await SecureStore.setItemAsync(REFRESH_TOKEN_STORAGE_KEY, token);
}

export async function getRefreshToken(): Promise<string | null> {
  if (Platform.OS === "web") {
    if (typeof localStorage !== "undefined") {
      return localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
    }
    return null;
  }
  return await SecureStore.getItemAsync(REFRESH_TOKEN_STORAGE_KEY);
}

export async function deleteRefreshToken(): Promise<void> {
  if (Platform.OS === "web") {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
    }
    return;
  }
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_STORAGE_KEY);
}

function base64Decode(str: string): string {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad = base64.length % 4;
  const padded = pad ? base64 + "=".repeat(4 - pad) : base64;
  if (typeof atob === "function") {
    return atob(padded);
  }
  // Fallback for environments where atob is not available
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  let output = "";
  for (
    let bc = 0, bs = 0, buffer = 0, idx = 0;
    idx < padded.length;
    idx++
  ) {
    const char = padded.charAt(idx);
    const b = chars.indexOf(char);
    if (b === -1) continue;
    bs = bc % 4 ? bs * 64 + b : b;
    if (bc++ % 4) {
      output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6)));
    }
  }
  return output;
}

/** Decode only -- never trust this for authorization, only for "is it worth sending". Real check happens server-side against signature. */
export function decodeAccessToken(token: string): DecodedAccessToken | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const jsonStr = base64Decode(payload);
    const json: unknown = JSON.parse(jsonStr);
    if (
      typeof json !== "object" ||
      json === null ||
      typeof (json as Record<string, unknown>).sub !== "string" ||
      typeof (json as Record<string, unknown>).exp !== "number"
    ) {
      return null;
    }
    const record = json as Record<string, unknown>;
    return {
      sub: record.sub as string,
      sid: typeof record.sid === "string" ? record.sid : undefined,
      exp: record.exp as number,
    };
  } catch {
    return null;
  }
}

export function isExpired(exp: number): boolean {
  return Date.now() >= (exp - EXPIRY_SKEW_SECONDS) * 1000;
}
