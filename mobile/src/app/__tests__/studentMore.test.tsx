import { fireEvent, render, screen } from "@testing-library/react-native";
import More from "@/app/(student)/(tabs)/more";
import { accountService } from "@/features/account/accountService";

const mockPush = jest.fn();
const mockLogout = jest.fn(async () => {});
jest.mock("@/lib/confirm", () => ({ confirm: jest.fn(async () => true) }));
jest.mock("expo-router", () => ({ useRouter: () => ({ canGoBack: () => true, push: mockPush }), useFocusEffect: (callback: () => void) => require("react").useEffect(callback, [callback]) }));
jest.mock("@/features/auth/useAuth", () => ({ useAuth: () => ({ user: { username: "ana", displayName: "Nome antigo" }, logout: mockLogout }) }));
jest.mock("@/features/account/accountService", () => ({ accountService: { get: jest.fn() } }));
jest.mock("@/features/chat/chatService", () => ({ studentChatService: { unreadCount: jest.fn(async () => ({ count: 0 })) } }));

it("loads the current account and opens the student's profile from its header card", async () => {
  jest.mocked(accountService.get).mockResolvedValue({ username: "ana", email: "ana@h.local", displayName: "Ana Maria", roles: ["STUDENT"], teacher: null, hasAvatar: false });
  await render(<More />);
  expect(await screen.findByText("Ana Maria")).toBeVisible();
  await fireEvent.press(screen.getByRole("button", { name: "Ver perfil" }));
  expect(mockPush).toHaveBeenCalledWith("/(student)/profile");
  expect(screen.getByRole("button", { name: /Minhas metas/ })).toBeVisible();
});

it("opens settings to change the password", async () => {
  await render(<More />);
  await screen.findByText("Ana Maria");
  await fireEvent.press(screen.getByRole("button", { name: /Configurações/ }));
  expect(mockPush).toHaveBeenCalledWith("/(student)/settings");
});

it("delegates sign-out to the provider", async () => {
  await render(<More />);
  await screen.findByText("Ana Maria");
  await fireEvent.press(screen.getByRole("button", { name: /Sair/ }));
  expect(mockLogout).toHaveBeenCalledTimes(1);
});
