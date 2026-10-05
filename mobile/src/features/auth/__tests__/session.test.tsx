import { render, screen, waitFor, act } from "@testing-library/react-native";
import { Text } from "react-native";
import { AuthProvider, useAuth } from "../useAuth";
import { authService } from "../authService";
import { tokenStorage } from "@/lib/http/tokenStorage";
import { authEvents } from "@/lib/http/authEvents";

jest.mock("../authService", () => ({
  ...jest.requireActual("../authService"),
  authService: { login: jest.fn(), me: jest.fn(), logout: jest.fn() },
}));
jest.mock("@/lib/http/tokenStorage", () => ({ tokenStorage: { get: jest.fn(), set: jest.fn(), clear: jest.fn() } }));
const service = authService as jest.Mocked<typeof authService>;
const storage = tokenStorage as jest.Mocked<typeof tokenStorage>;
function Session() {
  const { user, restoring } = useAuth();
  return <Text>{restoring ? "Restaurando" : user?.displayName ?? "Sem sessão"}</Text>;
}
beforeEach(() => { jest.clearAllMocks(); storage.get.mockResolvedValue("saved-token"); });
it("restores the saved session from the actual profile and responds to expiration", async () => {
  service.me.mockResolvedValue({ username: "student", displayName: "Ana", authorities: ["ROLE_STUDENT"] });
  await render(<AuthProvider><Session /></AuthProvider>);
  expect(await screen.findByText("Ana")).toBeVisible();
  expect(service.me).toHaveBeenCalledTimes(1);
  await act(() => { authEvents.emitLogout(); });
  expect(screen.getByText("Sem sessão")).toBeVisible();
});
it("does not send a profile request when no token is saved", async () => {
  storage.get.mockResolvedValue(null);
  await render(<AuthProvider><Session /></AuthProvider>);
  await waitFor(() => expect(screen.getByText("Sem sessão")).toBeVisible());
  expect(service.me).not.toHaveBeenCalled();
});
it("does not route an administrative profile into the student app", async () => {
  service.me.mockResolvedValue({ username: "admin", displayName: "Admin", authorities: ["ROLE_ADMIN"] });
  await render(<AuthProvider><Session /></AuthProvider>);
  expect(await screen.findByText("Sem sessão")).toBeVisible();
});
