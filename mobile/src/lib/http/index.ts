import { createApiClient } from "./apiClient";
import { tokenStorage } from "./tokenStorage";
import { authEvents } from "./authEvents";

export const api = createApiClient({
  baseUrl: process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8080",
  getAccessToken: () => tokenStorage.get(),
  setAccessToken: (a) => tokenStorage.set(a),
  clearAccessToken: () => tokenStorage.clear(),
  onAuthFailure: () => authEvents.emitLogout(),
});
