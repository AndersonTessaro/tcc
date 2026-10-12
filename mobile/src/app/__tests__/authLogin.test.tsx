import { act, render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { AuthProvider, useAuth } from "@/features/auth/useAuth";
import { authService } from "@/features/auth/authService";
import { authEvents } from "@/lib/http/authEvents";

jest.mock("@/features/auth/authService", () => ({
  ...jest.requireActual("@/features/auth/authService"),
  authService: { login: jest.fn(), me: jest.fn(), logout: jest.fn() },
}));
jest.mock("@/lib/http/tokenStorage", () => ({ tokenStorage: { get: jest.fn().mockResolvedValue(null) } }));
const service = authService as jest.Mocked<typeof authService>;
let currentLogin: ReturnType<typeof useAuth>["login"];
function Session() {
  const { user, login } = useAuth();
  currentLogin = login;
  return <Text>{user?.displayName ?? "Sem sessão"}</Text>;
}
beforeEach(() => {
  jest.clearAllMocks();
  service.login.mockResolvedValue({ username: "student", displayName: "Ana", accessToken: "new-token", authorities: ["ROLE_STUDENT"] });
});

it("does not restore the UI after login profile lookup reports authentication failure", async () => {
  service.me.mockImplementation(async () => { authEvents.emitLogout(); throw new Error("UNAUTHENTICATED"); });
  await render(<AuthProvider><Session /></AuthProvider>);
  await act(async () => { await expect(currentLogin("student", "password")).rejects.toThrow("UNAUTHENTICATED"); });
  expect(screen.getByText("Sem sessão")).toBeVisible();
});

it("keeps the login response as fallback for a non-auth profile error", async () => {
  service.me.mockRejectedValue(new Error("offline"));
  await render(<AuthProvider><Session /></AuthProvider>);
  await act(() => currentLogin("student", "password"));
  expect(screen.getByText("Ana")).toBeVisible();
});
