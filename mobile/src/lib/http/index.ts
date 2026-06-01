import { createApiClient } from "./apiClient";
import { tokenStorage } from "./tokenStorage";
import { authEvents } from "./authEvents";

export const api = createApiClient({
  baseUrl: process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8080",
  getTokens: () => tokenStorage.get(),
  setTokens: (a, r) => tokenStorage.set(a, r),
  clearTokens: () => tokenStorage.clear(),
  onAuthFailure: () => authEvents.emitLogout(),
});
