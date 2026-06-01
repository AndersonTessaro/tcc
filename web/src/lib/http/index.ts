import { createApiClient } from "./apiClient";
import { authStorage } from "./authStorage";
import { authEvents } from "./authEvents";

export const api = createApiClient({
  baseUrl: import.meta.env.VITE_API_BASE_URL,
  getTokens: () => authStorage.get(),
  setTokens: (a, r) => authStorage.set(a, r),
  clearTokens: () => authStorage.clear(),
  onAuthFailure: () => authEvents.emitLogout(),
});
