import * as SecureStore from "expo-secure-store";

const ACCESS = "harmonia_access";
const REFRESH = "harmonia_refresh";

export const tokenStorage = {
  async get() {
    return {
      access: await SecureStore.getItemAsync(ACCESS),
      refresh: await SecureStore.getItemAsync(REFRESH),
    };
  },
  async set(access: string, refresh: string) {
    await SecureStore.setItemAsync(ACCESS, access);
    await SecureStore.setItemAsync(REFRESH, refresh);
  },
  async clear() {
    await SecureStore.deleteItemAsync(ACCESS);
    await SecureStore.deleteItemAsync(REFRESH);
  },
};
