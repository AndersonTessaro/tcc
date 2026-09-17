import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const ACCESS = "harmonia_access";

// expo-secure-store has no web implementation - its methods throw on web, which
// would break every request before it leaves the app. localStorage covers web.
const webStorage = {
  get: async () => {
    try {
      return globalThis.localStorage?.getItem(ACCESS) ?? null;
    } catch {
      return null;
    }
  },
  set: async (access: string) => {
    try {
      globalThis.localStorage?.setItem(ACCESS, access);
    } catch {
      // storage blocked (private mode) - session stays in memory only
    }
  },
  clear: async () => {
    try {
      globalThis.localStorage?.removeItem(ACCESS);
    } catch {
      // nothing to clear
    }
  },
};

const nativeStorage = {
  get: () => SecureStore.getItemAsync(ACCESS),
  set: async (access: string) => {
    await SecureStore.setItemAsync(ACCESS, access);
  },
  clear: async () => {
    await SecureStore.deleteItemAsync(ACCESS);
  },
};

// The refresh token is not stored here: the backend returns it as an httpOnly
// cookie scoped to /auth, so the platform cookie jar owns it.
export const tokenStorage = Platform.OS === "web" ? webStorage : nativeStorage;
