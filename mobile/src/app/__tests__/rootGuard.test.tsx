import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import RootLayout from "@/app/_layout";
import { useAuth } from "@/features/auth/useAuth";
import { authService } from "@/features/auth/authService";
import { tokenStorage } from "@/lib/http/tokenStorage";
import { authEvents } from "@/lib/http/authEvents";
import { ApiError } from "@/lib/http/apiError";
import { RequestTimeoutError } from "@/lib/http/apiClient";
import { api } from "@/lib/http";
import { Text, View } from "react-native";
import { Button } from "@/ui/Button";

jest.mock("@/global.css", () => ({}));

const mockReplace = jest.fn();
let mockSegments: string[] = [];
jest.mock("expo-router", () => ({
  Slot: () => null,
  useRouter: () => ({ canGoBack: () => true, replace: mockReplace }),
  useSegments: () => mockSegments,
}));
jest.mock("@/features/auth/useAuth", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: jest.fn(),
}));

const auth = useAuth as jest.Mock;
const student = { authorities: ["ROLE_STUDENT"] };
const teacher = { authorities: ["ROLE_TEACHER"] };

beforeEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

it.each([
  ["a restored student at the root", student, [], "/(student)/dashboard"],
  ["a restored teacher at the root", teacher, [], "/teacher/dashboard"],
  ["a teacher inside the student area", teacher, ["(student)", "(tabs)", "dashboard"], "/teacher/dashboard"],
  ["a signed-in student on the login screen", student, ["(auth)", "login"], "/(student)/dashboard"],
  ["a visitor at the root", null, [], "/(auth)/login"],
])("redirects %s", async (_case, user, segments, target) => {
  auth.mockReturnValue({ user, restoring: false });
  mockSegments = segments as string[];

  await render(<RootLayout />);

  expect(mockReplace).toHaveBeenCalledWith(target);
});

it("leaves a student inside the student area alone", async () => {
  auth.mockReturnValue({ user: student, restoring: false });
  mockSegments = ["(student)", "(tabs)", "lessons"];

  await render(<RootLayout />);

  expect(mockReplace).not.toHaveBeenCalled();
});

it("shows a restore failure without redirecting and retries on request", async () => {
  const retryRestore = jest.fn();
  auth.mockReturnValue({ user: null, restoring: false, restoreError: new TypeError("offline"), retryRestore });
  mockSegments = [];
  await render(<RootLayout />);
  expect(screen.getByRole("header", { name: "Sem conexão com o servidor" })).toBeVisible();
  expect(mockReplace).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole("button", { name: "Tentar novamente" }));
  expect(retryRestore).toHaveBeenCalledTimes(1);
});

it("signs out explicitly before going to login from the restore failure", async () => {
  const logout = jest.fn(async () => {});
  auth.mockReturnValue({ user: null, restoring: false, restoreError: new Error("HTTP_503"), logout });
  mockSegments = [];
  await render(<RootLayout />);
  await fireEvent.press(screen.getByRole("button", { name: "Voltar ao login" }));
  expect(logout).toHaveBeenCalledTimes(1);
  expect(mockReplace).toHaveBeenCalledWith("/(auth)/login");
});

it("waits for restoration before redirecting", async () => {
  auth.mockReturnValue({ user: null, restoring: true, restoreError: null });
  mockSegments = [];
  await render(<RootLayout />);
  expect(mockReplace).not.toHaveBeenCalled();
});

const actualAuth = jest.requireActual<typeof import("@/features/auth/useAuth")>("@/features/auth/useAuth");
const profile = { username: "ana", displayName: "Ana", authorities: ["ROLE_STUDENT"], hasAvatar: false };

function SessionControls() {
  const { user, logout } = actualAuth.useAuth();
  return <View>
    <Text>{user?.displayName ?? "Sem sessão"}</Text>
    <Button label="Sair da conta" onPress={logout} />
  </View>;
}

it.each([[false, false], [true, false], [false, true]])("signs out a restored user with server failure %s and storage failure %s", async (serverFails, storageFails) => {
  jest.spyOn(tokenStorage, "get").mockResolvedValue("saved-token");
  jest.spyOn(authService, "me").mockResolvedValueOnce(profile);
  const post = jest.spyOn(api, "post").mockImplementation(async () => {
    expect(screen.getByText("Ana")).toBeVisible();
    if (serverFails) throw new Error("offline");
  });
  const clear = jest.spyOn(tokenStorage, "clear").mockImplementation(async () => {
    expect(screen.getByText("Ana")).toBeVisible();
    if (storageFails) throw new Error("storage failure");
  });
  auth.mockImplementation(actualAuth.useAuth);
  mockSegments = ["(student)", "(tabs)", "more"];
  await render(<actualAuth.AuthProvider><RootLayout /><SessionControls /></actualAuth.AuthProvider>);
  await screen.findByText("Ana");
  await fireEvent.press(screen.getByRole("button", { name: "Sair da conta" }));
  expect(post).toHaveBeenCalledWith("/auth/logout", undefined, { timeoutMs: 5_000 });
  expect(clear).toHaveBeenCalledTimes(1);
  expect(screen.getByText("Sem sessão")).toBeVisible();
  expect(mockReplace).toHaveBeenCalledWith("/(auth)/login");
});

async function renderSession() {
  auth.mockImplementation(actualAuth.useAuth);
  mockSegments = [];
  await render(<actualAuth.AuthProvider><RootLayout /></actualAuth.AuthProvider>);
}

it.each([new TypeError("offline"), new RequestTimeoutError(), new ApiError(503)])("preserves the token on restore failure and retries the actual provider", async (cause) => {
  jest.spyOn(tokenStorage, "get").mockResolvedValue("saved-token");
  const clear = jest.spyOn(tokenStorage, "clear").mockResolvedValue();
  const me = jest.spyOn(authService, "me").mockRejectedValueOnce(cause).mockResolvedValueOnce(profile);
  await renderSession();
  expect(await screen.findByRole("header", { name: "Sem conexão com o servidor" })).toBeVisible();
  expect(mockReplace).not.toHaveBeenCalled();
  expect(clear).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole("button", { name: "Tentar novamente" }));
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/(student)/dashboard"));
  expect(me).toHaveBeenCalledTimes(2);
});

it("redirects to login on UNAUTHENTICATED instead of offering connection retry", async () => {
  jest.spyOn(tokenStorage, "get").mockResolvedValue("saved-token");
  jest.spyOn(authService, "me").mockRejectedValueOnce(new Error("UNAUTHENTICATED"));
  await renderSession();
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/(auth)/login"));
  expect(screen.queryByRole("button", { name: "Tentar novamente" })).toBeNull();
});

it.each([false, true])("waits for sign-out and goes to login even when the server fails: %s", async (fails) => {
  jest.spyOn(tokenStorage, "get").mockResolvedValue("saved-token");
  jest.spyOn(authService, "me").mockRejectedValueOnce(new TypeError("offline"));
  const signOut = jest.spyOn(authService, "logout").mockImplementation(async () => {
    await Promise.resolve();
    expect(mockReplace).not.toHaveBeenCalled();
    if (fails) throw new Error("offline");
  });
  await renderSession();
  const button = await screen.findByRole("button", { name: "Voltar ao login" });
  await fireEvent.press(button);
  expect(signOut).toHaveBeenCalledTimes(1);
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/(auth)/login"));
  expect(screen.queryByRole("header", { name: "Sem conexão com o servidor" })).toBeNull();
});

it("handles expiration without invoking server sign-out again", async () => {
  jest.spyOn(tokenStorage, "get").mockResolvedValue("saved-token");
  jest.spyOn(authService, "me").mockResolvedValueOnce(profile);
  const signOut = jest.spyOn(authService, "logout").mockResolvedValue();
  await renderSession();
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/(student)/dashboard"));
  mockReplace.mockClear();
  await act(() => authEvents.emitLogout());
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/(auth)/login"));
  expect(signOut).not.toHaveBeenCalled();
});

describe("terms of use", () => {
  const terms = { version: "2026-11-20", text: "## 1. Sobre o Sonetto\nTexto dos termos." };

  it("blocks the app until the user accepts the current terms", async () => {
    const updateProfile = jest.fn();
    auth.mockReturnValue({ user: { ...student, termsAccepted: false }, restoring: false, updateProfile });
    mockSegments = ["(student)", "(tabs)", "dashboard"];
    jest.spyOn(authService, "terms").mockResolvedValue(terms);
    const accept = jest.spyOn(authService, "acceptTerms").mockResolvedValue(undefined);

    await render(<RootLayout />);

    expect(await screen.findByRole("header", { name: "Termos de uso" })).toBeVisible();
    expect(screen.getByText("1. Sobre o Sonetto")).toBeVisible();
    expect(screen.getByRole("button", { name: "Continuar" })).toBeDisabled();
    await fireEvent.press(screen.getByRole("checkbox", { name: "Li e aceito os termos de uso e a política de privacidade" }));
    await fireEvent.press(screen.getByRole("button", { name: "Continuar" }));

    await waitFor(() => expect(accept).toHaveBeenCalledWith("2026-11-20"));
    expect(updateProfile).toHaveBeenCalledWith({ termsAccepted: true });
  });

  it("does not ask again once the terms are accepted", async () => {
    auth.mockReturnValue({ user: { ...student, termsAccepted: true }, restoring: false });
    mockSegments = ["(student)", "(tabs)", "dashboard"];
    const load = jest.spyOn(authService, "terms");

    await render(<RootLayout />);

    expect(screen.queryByRole("header", { name: "Termos de uso" })).toBeNull();
    expect(load).not.toHaveBeenCalled();
  });
});
