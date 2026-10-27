import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import Profile from "@/app/(student)/profile";
import { accountService } from "@/features/account/accountService";
import { avatarService, AvatarValidationError } from "@/features/account/avatarService";
import * as DocumentPicker from "expo-document-picker";

const mockUpdateProfile = jest.fn();
jest.mock("@/features/auth/useAuth", () => ({ useAuth: () => ({ updateProfile: mockUpdateProfile }) }));

jest.mock("expo-router", () => ({ useRouter: () => ({ back: jest.fn() }), useFocusEffect: (callback: () => void) => require("react").useEffect(callback, [callback]) }));
jest.mock("@/features/account/accountService", () => ({ accountService: { get: jest.fn(), update: jest.fn() } }));
jest.mock("@/features/account/avatarService", () => ({ AvatarValidationError: class extends Error {}, avatarService: { get: jest.fn().mockResolvedValue(null), upload: jest.fn().mockResolvedValue(undefined), remove: jest.fn().mockResolvedValue(undefined), subscribe: () => () => {}, getVersion: () => 0 } }));
jest.mock("expo-document-picker", () => ({ getDocumentAsync: jest.fn() }));
const account = { username: "ana", email: "ana@h.local", displayName: "Ana", teacher: null, roles: ["STUDENT"], hasAvatar: false };

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(accountService.get).mockResolvedValue(account);
  jest.mocked(accountService.update).mockResolvedValue({ ...account, displayName: "Ana Maria" });
});

it("loads and saves the student's display name using the account contract", async () => {
  await render(<Profile />);
  await fireEvent.changeText(await screen.findByLabelText("Nome"), " Ana Maria ");
  await fireEvent.press(screen.getByRole("button", { name: "Salvar" }));
  expect(accountService.update).toHaveBeenCalledWith({ displayName: "Ana Maria" });
  expect(screen.getByLabelText("Nome")).toHaveProp("value", "Ana Maria");
  expect(screen.getByLabelText("Usuário: ana")).toBeVisible();
  expect(mockUpdateProfile).toHaveBeenCalledWith({ displayName: "Ana Maria", hasAvatar: false });
});

it("edits and saves the student's bio", async () => {
  const withBio = { ...account, student: { bio: "Violão" } };
  jest.mocked(accountService.get).mockResolvedValue(withBio);
  jest.mocked(accountService.update).mockResolvedValue({ ...withBio, student: { bio: "Violão e canto" } });
  await render(<Profile />);
  expect(await screen.findByLabelText("Bio")).toHaveProp("value", "Violão");
  await fireEvent.changeText(screen.getByLabelText("Bio"), "Violão e canto");
  await fireEvent.press(screen.getByRole("button", { name: "Salvar" }));
  expect(accountService.update).toHaveBeenCalledWith({ displayName: "Ana", bio: "Violão e canto" });
  expect(screen.getByLabelText("Bio")).toHaveProp("value", "Violão e canto");
  expect(screen.queryByText("Instrumentos")).toBeNull();
});

it("uploads a selected photo, enables removal and updates the avatar", async () => {
  jest.mocked(DocumentPicker.getDocumentAsync).mockResolvedValue({ canceled: false, assets: [{ uri: "file:///a.png", name: "a.png", mimeType: "image/png", size: 100 }] });
  await render(<Profile />);
  await fireEvent.press(await screen.findByRole("button", { name: "Escolher foto" }));
  expect(DocumentPicker.getDocumentAsync).toHaveBeenCalledWith({ type: ["image/png", "image/jpeg"], copyToCacheDirectory: true });
  expect(avatarService.upload).toHaveBeenCalledWith(expect.objectContaining({ name: "a.png", size: 100 }));
  await fireEvent.press(await screen.findByRole("button", { name: "Remover foto" }));
  expect(avatarService.remove).toHaveBeenCalledTimes(1);
  await waitFor(() => expect(screen.queryByRole("button", { name: "Remover foto" })).toBeNull());
});

it("does not upload when the photo picker is canceled", async () => {
  jest.mocked(DocumentPicker.getDocumentAsync).mockResolvedValue({ canceled: true, assets: null });
  await render(<Profile />);
  await fireEvent.press(await screen.findByRole("button", { name: "Escolher foto" }));
  expect(avatarService.upload).not.toHaveBeenCalled();
});

it("shows photo validation errors without changing the account avatar", async () => {
  jest.mocked(DocumentPicker.getDocumentAsync).mockResolvedValue({ canceled: false, assets: [{ uri: "file:///big.png", name: "big.png", mimeType: "image/png", size: 3000000 }] });
  jest.mocked(avatarService.upload).mockRejectedValueOnce(new AvatarValidationError("Escolha uma foto de até 2 MB."));
  await render(<Profile />);
  await fireEvent.press(await screen.findByRole("button", { name: "Escolher foto" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Escolha uma foto de até 2 MB.");
  expect(screen.queryByRole("button", { name: "Remover foto" })).toBeNull();
});

it("keeps a photo after a failed removal and allows retrying", async () => {
  jest.mocked(accountService.get).mockResolvedValue({ ...account, hasAvatar: true });
  jest.mocked(avatarService.remove).mockRejectedValueOnce(new TypeError("offline"));
  await render(<Profile />);
  await fireEvent.press(await screen.findByRole("button", { name: "Remover foto" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Sem conexão com o servidor");
  expect(screen.getByRole("button", { name: "Remover foto" })).toBeEnabled();
  await fireEvent.press(screen.getByRole("button", { name: "Remover foto" }));
  expect(screen.queryByRole("button", { name: "Remover foto" })).toBeNull();
});

it("prevents a profile save during a pending photo mutation", async () => {
  let finish!: () => void;
  jest.mocked(DocumentPicker.getDocumentAsync).mockResolvedValue({ canceled: false, assets: [{ uri: "file:///a.png", name: "a.png", mimeType: "image/png" }] });
  jest.mocked(avatarService.upload).mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
  await render(<Profile />);
  await fireEvent.changeText(await screen.findByLabelText("Nome"), "Ana Maria");
  await fireEvent.press(screen.getByRole("button", { name: "Escolher foto" }));
  await waitFor(() => expect(avatarService.upload).toHaveBeenCalled());
  expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled();
  await fireEvent.press(screen.getByRole("button", { name: "Salvar" }));
  expect(accountService.update).not.toHaveBeenCalled();
  await act(() => finish());
  expect(screen.getByLabelText("Nome")).toHaveProp("value", "Ana Maria");
  jest.mocked(accountService.update).mockResolvedValueOnce({ ...account, displayName: "Ana Maria", hasAvatar: true });
  await fireEvent.press(screen.getByRole("button", { name: "Salvar" }));
  expect(accountService.update).toHaveBeenCalledWith({ displayName: "Ana Maria" });
});

it("prevents a photo mutation while the name is being saved", async () => {
  let finish!: (saved: typeof account) => void;
  jest.mocked(accountService.update).mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
  await render(<Profile />);
  await fireEvent.changeText(await screen.findByLabelText("Nome"), "Ana Maria");
  await fireEvent.press(screen.getByRole("button", { name: "Salvar" }));
  expect(screen.getByRole("button", { name: "Escolher foto" })).toBeDisabled();
  await fireEvent.press(screen.getByRole("button", { name: "Escolher foto" }));
  expect(DocumentPicker.getDocumentAsync).not.toHaveBeenCalled();
  await act(() => finish({ ...account, displayName: "Ana Maria" }));
  expect(screen.getByRole("button", { name: "Escolher foto" })).toBeEnabled();
  expect(screen.getByLabelText("Nome")).toHaveProp("value", "Ana Maria");
});
