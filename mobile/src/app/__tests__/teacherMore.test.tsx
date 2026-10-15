import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import More from "@/app/teacher/(tabs)/more";
import Profile from "@/app/teacher/profile";
import Classes from "@/app/teacher/classes";
import Makeups from "@/app/teacher/makeups";
import Finance from "@/app/teacher/finance";
import Settings from "@/app/teacher/settings";
import Help from "@/app/teacher/help";
import { accountService, type Account } from "@/features/account/accountService";
import { teacherService, type TeacherMakeup } from "@/features/teacher/teacherService";
import { addDays, todayIso } from "@/lib/format";
import { ApiError } from "@/lib/http/apiError";
import { tokenStorage } from "@/lib/http/tokenStorage";
import { confirm } from "@/lib/confirm";
import { authService } from "@/features/auth/authService";

const mockPush = jest.fn();
const mockLogout = jest.fn();
const mockToast = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
  useFocusEffect: (callback: () => void) => require("react").useEffect(callback, [callback]),
}));
jest.mock("@/hooks/use-tab-scroll-to-top", () => ({ useTabScrollToTop: jest.fn() }));
jest.mock("@/features/auth/useAuth", () => ({ useAuth: () => ({ user: { displayName: "Nome antigo", username: "teacher" }, logout: mockLogout }) }));
jest.mock("@/features/auth/authService", () => ({ authService: { logout: jest.fn() } }));
jest.mock("@/features/account/accountService", () => ({ accountService: { get: jest.fn(), update: jest.fn(), changePassword: jest.fn() } }));
jest.mock("@/features/teacher/teacherService", () => ({ teacherService: { enrollments: jest.fn(), finance: jest.fn(), makeups: jest.fn() } }));
jest.mock("@/ui/Toast", () => ({ useToast: () => ({ show: mockToast }) }));
jest.mock("@/lib/http/tokenStorage", () => ({ tokenStorage: { clear: jest.fn() } }));
jest.mock("@/lib/confirm", () => ({ confirm: jest.fn() }));
jest.mock("expo-constants", () => ({ __esModule: true, default: { expoConfig: { version: "1.0.0" } } }));

const account = jest.mocked(accountService);
const teacher = jest.mocked(teacherService);
const profile: Account = {
  username: "teacher", email: "teacher@h.local", displayName: "Maria Souza", roles: ["TEACHER"],
  teacher: { bio: "Piano", instruments: [{ id: "piano", name: "Piano" }] },
};
const makeup: TeacherMakeup = {
  id: "makeup-1", studentName: "Ana", instrument: "Piano", reason: "Falta justificada",
  original: { lessonId: "old", date: "2026-10-10", startTime: "09:00:00", status: "DONE" },
  makeup: { lessonId: "new", date: "2026-10-20", startTime: "11:00:00", endTime: "12:00:00", status: "SCHEDULED" },
};

beforeEach(() => {
  jest.clearAllMocks();
  account.get.mockResolvedValue(profile);
  account.update.mockResolvedValue(profile);
  account.changePassword.mockResolvedValue(undefined);
  teacher.enrollments.mockResolvedValue([]);
  teacher.finance.mockResolvedValue({ monthlyTotal: 0, withoutFee: 0, items: [] });
  teacher.makeups.mockResolvedValue([]);
  jest.mocked(tokenStorage.clear).mockResolvedValue(undefined);
  jest.mocked(confirm).mockResolvedValue(true);
  jest.mocked(authService.logout).mockResolvedValue(undefined);
});

it("shows the Figma menu in order and navigates to every screen", async () => {
  await render(<More />);
  expect(await screen.findByText("Maria Souza")).toBeVisible();
  expect(screen.getAllByRole("button").map((button) => button.props.accessibilityLabel)).toEqual([
    "Ver perfil", "Turmas", "Horários", "Reposições", "Histórico de aulas", "Financeiro", "Configurações", "Ajuda", "Sair",
  ]);
  for (const [label, route] of [
    ["Ver perfil", "profile"], ["Turmas", "classes"], ["Horários", "schedules"], ["Reposições", "makeups"], ["Histórico de aulas", "history"],
    ["Financeiro", "finance"], ["Configurações", "settings"], ["Ajuda", "help"],
  ]) {
    await fireEvent.press(screen.getByRole("button", { name: label }));
    expect(mockPush).toHaveBeenLastCalledWith(`/teacher/${route}`);
  }
  await fireEvent.press(screen.getByRole("button", { name: "Sair" }));
  expect(authService.logout).toHaveBeenCalled();
  expect(mockLogout).toHaveBeenCalled();
});

it("honors a canceled logout confirmation", async () => {
  jest.mocked(confirm).mockResolvedValue(false);
  await render(<More />);
  await screen.findByText("Maria Souza");
  await fireEvent.press(screen.getByRole("button", { name: "Sair" }));
  expect(mockLogout).not.toHaveBeenCalled();
});

it("loads profile identity and instruments and saves name and bio", async () => {
  await render(<Profile />);
  expect(await screen.findByDisplayValue("Maria Souza")).toBeVisible();
  expect(screen.getByLabelText("E-mail: teacher@h.local")).toBeVisible();
  expect(screen.getByLabelText("Usuário: teacher")).toBeVisible();
  expect(screen.queryByDisplayValue("teacher@h.local")).toBeNull();
  expect(screen.getByText("Para alterar, fale com a secretaria")).toBeVisible();
  expect(screen.getByText("Piano")).toBeVisible();
  await fireEvent.changeText(screen.getByLabelText("Nome"), "Maria Atualizada");
  await fireEvent.changeText(screen.getByLabelText("Bio"), "Piano e canto");
  await fireEvent.press(screen.getByRole("button", { name: "Salvar" }));
  expect(account.update).toHaveBeenCalledWith({ displayName: "Maria Atualizada", bio: "Piano e canto" });
  expect(mockToast).toHaveBeenCalledWith("Perfil atualizado", "success");
});

it("validates profile fields locally and reports save failures", async () => {
  await render(<Profile />);
  await screen.findByDisplayValue("Maria Souza");
  await fireEvent.changeText(screen.getByLabelText("Nome"), " ");
  await fireEvent.press(screen.getByRole("button", { name: "Salvar" }));
  expect(screen.getByText("Informe seu nome.")).toBeVisible();
  expect(account.update).not.toHaveBeenCalled();
  await fireEvent.changeText(screen.getByLabelText("Nome"), "Maria");
  account.update.mockRejectedValueOnce(new TypeError("Failed to fetch"));
  await fireEvent.press(screen.getByRole("button", { name: "Salvar" }));
  expect(await screen.findByText("Sem conexão com o servidor")).toBeVisible();
});

it("groups enrollments by classLabel, counts unique students and opens a student", async () => {
  teacher.enrollments.mockResolvedValue([
    { id: "1", studentId: "ana", studentName: "Ana", instrument: "Piano", classLabel: "Piano - A" },
    { id: "2", studentId: "bia", studentName: "Bia", instrument: "Piano", classLabel: "Piano - A" },
    { id: "3", studentId: "ana", studentName: "Ana", instrument: "Piano", classLabel: "Piano - A" },
    { id: "4", studentId: "caio", studentName: "Caio", instrument: "Violão", classLabel: "Violão" },
  ]);
  await render(<Classes />);
  expect(await screen.findByText("Piano - A")).toBeVisible();
  expect(screen.getByText("2 alunos")).toBeVisible();
  expect(screen.getByText("1 aluno")).toBeVisible();
  expect(screen.getByText("Violão")).toBeVisible();
  await fireEvent.press(screen.getByRole("button", { name: "Ana" }));
  expect(mockPush).toHaveBeenCalledWith("/teacher/student/ana");
});

it("shows finance totals, defined and undefined fees as read only", async () => {
  teacher.finance.mockResolvedValue({ monthlyTotal: 150.5, withoutFee: 1, items: [
    { enrollmentId: "1", studentId: "ana", studentName: "Ana", classLabel: "Piano", monthlyFee: 150.5 },
    { enrollmentId: "2", studentId: "bia", studentName: "Bia", classLabel: "Violão", monthlyFee: null },
    { enrollmentId: "3", studentId: "caio", studentName: "Caio", classLabel: "Piano", monthlyFee: 0 },
  ] });
  await render(<Finance />);
  expect(await screen.findByText("1 aluno sem mensalidade definida")).toBeVisible();
  expect(screen.getAllByText(/R\$\s*150,50/)).toHaveLength(2);
  expect(screen.getByText(/R\$\s*0,00/)).toBeVisible();
  expect(screen.getByText("Não definida")).toBeVisible();
  expect(screen.getByText("Valores definidos pela secretaria")).toBeVisible();
  expect(screen.queryByRole("button", { name: "Salvar" })).toBeNull();
});

it("shows the empty makeup hint and switches upcoming and past periods", async () => {
  await render(<Makeups />);
  expect(await screen.findByText("Nenhuma reposição")).toBeVisible();
  expect(screen.getByText("Crie pela Agenda → Repor")).toBeVisible();
  expect(teacher.makeups).toHaveBeenLastCalledWith(todayIso(), addDays(todayIso(), 60));
  teacher.makeups.mockResolvedValue([makeup]);
  await fireEvent.press(screen.getByRole("radio", { name: "Passadas" }));
  expect(await screen.findByText("Ana")).toBeVisible();
  expect(teacher.makeups).toHaveBeenLastCalledWith(addDays(todayIso(), -30), addDays(todayIso(), -1));
  expect(screen.getByText("Original: 10/10 09:00 → Reposição: 20/10 11:00")).toBeVisible();
  expect(screen.getByText("Falta justificada")).toBeVisible();
  expect(screen.getByText("Agendada")).toBeVisible();
});

async function fillPasswords(current = "Current@123", next = "Changed@123", confirmation = next) {
  await fireEvent.changeText(screen.getByLabelText("Senha atual"), current);
  await fireEvent.changeText(screen.getByLabelText("Nova senha"), next);
  await fireEvent.changeText(screen.getByLabelText("Confirmar nova senha"), confirmation);
}

it("validates password fields without submitting and displays app version", async () => {
  await render(<Settings />);
  expect(screen.getByText("Versão 1.0.0")).toBeVisible();
  await fireEvent.press(screen.getByRole("button", { name: "Trocar senha" }));
  expect(screen.getByText("Informe sua senha atual.")).toBeVisible();
  expect(screen.getByText("Use pelo menos 8 caracteres.")).toBeVisible();
  expect(screen.getByText("As senhas não coincidem.")).toBeVisible();
  await fillPasswords("Current@123", "Changed@123", "different");
  await fireEvent.press(screen.getByRole("button", { name: "Trocar senha" }));
  expect(screen.getByText("As senhas não coincidem.")).toBeVisible();
  expect(account.changePassword).not.toHaveBeenCalled();
});

it.each([
  ["Current@123", "Current@123", "A nova senha deve ser diferente da atual."],
  ["Current@123", "á".repeat(37), "Use até 72 bytes na nova senha."],
])("rejects an invalid new password locally: %s %s", async (current, next, message) => {
  await render(<Settings />);
  await fillPasswords(current, next);
  await fireEvent.press(screen.getByRole("button", { name: "Trocar senha" }));
  expect(screen.getByText(message)).toBeVisible();
  expect(account.changePassword).not.toHaveBeenCalled();
});

it("toggles password visibility independently", async () => {
  await render(<Settings />);
  expect(screen.getByLabelText("Senha atual")).toHaveProp("secureTextEntry", true);
  await fireEvent.press(screen.getByRole("button", { name: "Mostrar senha atual" }));
  expect(screen.getByLabelText("Senha atual")).toHaveProp("secureTextEntry", false);
  expect(screen.getByLabelText("Nova senha")).toHaveProp("secureTextEntry", true);
  await fireEvent.press(screen.getByRole("button", { name: "Ocultar senha atual" }));
  expect(screen.getByLabelText("Senha atual")).toHaveProp("secureTextEntry", true);
});

it("shows wrong current password 422 on its field and keeps the session", async () => {
  account.changePassword.mockRejectedValueOnce(new ApiError(422, "DOMAIN_VALIDATION", "Current password is incorrect"));
  await render(<Settings />);
  await fillPasswords();
  await fireEvent.press(screen.getByRole("button", { name: "Trocar senha" }));
  expect(await screen.findByText("Senha atual incorreta.")).toBeVisible();
  expect(screen.getByLabelText("Senha atual")).toHaveProp("aria-invalid", true);
  expect(mockLogout).not.toHaveBeenCalled();
  expect(tokenStorage.clear).not.toHaveBeenCalled();
});

it("changes the password, clears local tokens and logs out after success", async () => {
  await render(<Settings />);
  await fillPasswords();
  await fireEvent.press(screen.getByRole("button", { name: "Trocar senha" }));
  await waitFor(() => expect(mockLogout).toHaveBeenCalledTimes(1));
  expect(account.changePassword).toHaveBeenCalledWith({ currentPassword: "Current@123", newPassword: "Changed@123" });
  expect(mockToast).toHaveBeenCalledWith("Senha alterada. Entre novamente.", "success");
  expect(tokenStorage.clear).toHaveBeenCalledTimes(1);
});

it.each([
  ["profile", Profile, "account"], ["classes", Classes, "classes"], ["finance", Finance, "finance"], ["makeups", Makeups, "makeups"],
] as const)("retries data failures on %s", async (_name, Component, service) => {
  const loader = service === "account" ? account.get : service === "classes" ? teacher.enrollments : service === "finance" ? teacher.finance : teacher.makeups;
  loader.mockRejectedValueOnce(new TypeError("Failed to fetch"));
  await render(<Component />);
  expect(await screen.findByText("Sem conexão com o servidor")).toBeVisible();
  await fireEvent.press(screen.getByRole("button", { name: "Tentar novamente" }));
  await waitFor(() => expect(loader).toHaveBeenCalledTimes(2));
  expect(screen.queryByText("Sem conexão com o servidor")).toBeNull();
});

it("shows the FAQ, the unrecorded-absence rule and school contact guidance", async () => {
  await render(<Help />);
  expect(screen.getByText(/sem presença registrada conta como falta/)).toBeVisible();
  expect(screen.getByText("Dúvidas? Fale com a secretaria da escola")).toBeVisible();
  expect(screen.getByRole("header", { name: "Como adicionar anexos?" })).toBeVisible();
});

it("updates pristine profile fields on refresh and preserves unsaved edits", async () => {
  await render(<Profile />);
  await screen.findByDisplayValue("Maria Souza");
  const updated: Account = { ...profile, displayName: "Nome da secretaria", teacher: { ...profile.teacher!, bio: "Bio atualizada" } };
  account.get.mockResolvedValue(updated);
  await act(() => screen.getByLabelText("Perfil").props.refreshControl.props.onRefresh());
  expect(screen.getByLabelText("Nome")).toHaveProp("value", "Nome da secretaria");
  expect(screen.getByLabelText("Bio")).toHaveProp("value", "Bio atualizada");
  await fireEvent.changeText(screen.getByLabelText("Nome"), "Rascunho local");
  account.get.mockResolvedValue({ ...updated, displayName: "Outro nome" });
  await act(() => screen.getByLabelText("Perfil").props.refreshControl.props.onRefresh());
  expect(screen.getByLabelText("Nome")).toHaveProp("value", "Rascunho local");
});

it("logs out even when clearing native token storage fails", async () => {
  jest.mocked(tokenStorage.clear).mockRejectedValueOnce(new Error("Storage unavailable"));
  await render(<Settings />);
  await fillPasswords();
  await fireEvent.press(screen.getByRole("button", { name: "Trocar senha" }));
  expect(mockLogout).toHaveBeenCalledTimes(1);
  expect(mockToast).toHaveBeenCalledWith("Não foi possível limpar a sessão salva. A senha já foi alterada.", "error");
});
