import { fireEvent, render, screen } from "@testing-library/react-native";
import { confirm } from "@/lib/confirm";
import Goals from "@/app/(student)/goals";
import { studentService, type StudentGoal } from "@/features/student/studentService";
import { ApiError } from "@/lib/http/apiError";

const mockToast = jest.fn();
jest.mock("@/ui/Toast", () => ({ useToast: () => ({ show: mockToast }) }));
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  useFocusEffect: (callback: () => void) => require("react").useEffect(callback, [callback]),
}));
jest.mock("@/features/student/studentService", () => ({
  studentService: { goals: jest.fn(), createGoal: jest.fn(), endGoal: jest.fn() },
}));
jest.mock("@/lib/confirm", () => ({ confirm: jest.fn().mockResolvedValue(true) }));
const confirmation = jest.mocked(confirm);
const service = jest.mocked(studentService);
const activeGoal: StudentGoal = {
  id: "goal-1", title: "Praticar 3h", description: null, type: "PRACTICE_TIME", target: 180, currentProgress: 90, status: "ACTIVE",
  period: "WEEKLY", periodStart: "2026-10-13", periodEnd: "2026-10-19", legacy: false, createdByTeacher: null, canEnd: true, achieved: false, streak: 2,
};
const endedGoal: StudentGoal = { ...activeGoal, id: "goal-3", title: "Praticar 2h", target: 120, currentProgress: 150, status: "ENDED", canEnd: false, achieved: true };
const oldGoal: StudentGoal = { ...activeGoal, id: "goal-2", title: "Ler partitura", type: "OTHER", target: 5, currentProgress: 5, status: "COMPLETED", period: null, periodStart: null, periodEnd: null, legacy: true, canEnd: true };

beforeEach(() => {
  jest.clearAllMocks();
  service.endGoal.mockReset();
  confirmation.mockResolvedValue(true);
  service.goals.mockImplementation((status) => Promise.resolve(status === "ENDED" ? [endedGoal, oldGoal] : [activeGoal]));
  service.endGoal.mockResolvedValue({ ...activeGoal, status: "ENDED", canEnd: false });
  service.createGoal.mockResolvedValue(activeGoal);
});

it("switches cached active and ended lists and shows server progress and streak", async () => {
  await render(<Goals />);
  expect(await screen.findByText("1 h 30 min de 3 h")).toBeVisible();
  expect(screen.getByText("Esta semana · 13–19/10")).toBeVisible();
  expect(screen.getByText("2 semanas seguidas")).toBeVisible();
  expect(screen.queryByText("Atualizar progresso")).toBeNull();
  await fireEvent.press(screen.getByRole("tab", { name: "Encerradas" }));
  expect(screen.getByText("Ler partitura")).toBeVisible();
  expect(screen.getByText("Meta antiga")).toBeVisible();
  expect(screen.getByText("2 h 30 min de 2 h")).toBeVisible();
  expect(screen.getByText("Encerrada · 13–19/10")).toBeVisible();
  expect(screen.getByText("Cumprida")).toBeVisible();
  expect(screen.queryByRole("button", { name: /Encerrar meta/ })).toBeNull();
  expect(service.goals).toHaveBeenCalledTimes(2);
  expect(service.goals).toHaveBeenCalledWith("ACTIVE");
  expect(service.goals).toHaveBeenCalledWith("ENDED");
});

it("confirms ending and reloads both lists", async () => {
  await render(<Goals />);
  await fireEvent.press(await screen.findByRole("button", { name: "Encerrar meta Praticar 3h" }));
  expect(confirmation).toHaveBeenCalledWith(expect.objectContaining({ confirmLabel: "Encerrar", destructive: true }));
  expect(service.endGoal).toHaveBeenCalledWith("goal-1");
  expect(service.goals).toHaveBeenCalledTimes(4);
  expect(mockToast).toHaveBeenCalledWith("Meta encerrada", "success");
});

it("does not end when confirmation is canceled", async () => {
  confirmation.mockResolvedValueOnce(false);
  await render(<Goals />);
  await fireEvent.press(await screen.findByRole("button", { name: "Encerrar meta Praticar 3h" }));
  expect(service.endGoal).not.toHaveBeenCalled();
});

it("keeps teacher-defined goals and active legacy goals read-only", async () => {
  service.goals.mockResolvedValue([
    { ...activeGoal, createdByTeacher: "Carlos", canEnd: false, achieved: true, currentProgress: 240 },
    { ...oldGoal, status: "ACTIVE" },
  ]);
  await render(<Goals />);
  expect(await screen.findByText("Definida por Carlos")).toBeVisible();
  expect(screen.getByText("Cumprida")).toBeVisible();
  expect(screen.getByText("4 h de 3 h")).toBeVisible();
  expect(screen.getByText("Meta antiga")).toBeVisible();
  expect(screen.queryByRole("button", { name: /Encerrar meta/ })).toBeNull();
});

it("creates a recurring goal with a suggested title", async () => {
  await render(<Goals />);
  await screen.findByText("Praticar 3h");
  await fireEvent.press(screen.getByRole("button", { name: "Nova meta" }));
  await fireEvent.press(screen.getByRole("radio", { name: "Diária" }));
  await fireEvent.press(screen.getByRole("radio", { name: "30 min" }));
  await fireEvent.press(screen.getByRole("button", { name: "Salvar meta" }));
  expect(service.createGoal).toHaveBeenCalledWith({ title: "30 min de prática por dia", type: "PRACTICE_TIME", period: "DAILY", target: 30, description: undefined });
  expect(screen.queryByRole("button", { name: "Salvar meta" })).toBeNull();
  expect(mockToast).toHaveBeenCalledWith("Meta criada", "success");
});

it("translates end failures", async () => {
  service.endGoal.mockRejectedValueOnce(new ApiError(403, "OWNERSHIP_DENIED"));
  await render(<Goals />);
  await fireEvent.press(await screen.findByRole("button", { name: "Encerrar meta Praticar 3h" }));
  expect(mockToast).toHaveBeenCalledWith("Sem permissão para acessar este registro", "error");
});

it("retries list failures and shows empty states", async () => {
  service.goals.mockRejectedValueOnce(new Error("offline"));
  await render(<Goals />);
  expect(await screen.findByText("Não foi possível carregar suas metas.")).toBeVisible();
  service.goals.mockResolvedValue([]);
  await fireEvent.press(screen.getByRole("button", { name: "Tentar novamente" }));
  expect(await screen.findByText("Nenhuma meta ativa")).toBeVisible();
  await fireEvent.press(screen.getByRole("tab", { name: "Encerradas" }));
  expect(screen.getByText("Ler partitura")).toBeVisible();
});
