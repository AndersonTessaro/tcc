import { createApiClient } from "./apiClient";
import { authStorage } from "./authStorage";
import { authEvents } from "./authEvents";

export const api = createApiClient({
  baseUrl: import.meta.env.VITE_API_BASE_URL,
  getAccessToken: () => authStorage.get(),
  setAccessToken: (a) => authStorage.set(a),
  clearAccessToken: () => authStorage.clear(),
  onAuthFailure: () => authEvents.emitLogout(),
});
