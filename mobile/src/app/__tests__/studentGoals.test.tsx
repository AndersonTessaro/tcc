import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { confirm } from "@/lib/confirm";
import Goals from "@/app/(student)/goals";
import { studentService, type StudentGoal } from "@/features/student/studentService";

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  useFocusEffect: (callback: () => void) => require("react").useEffect(callback, [callback]),
}));
jest.mock("@/features/student/studentService", () => ({
  studentService: { goals: jest.fn(), createGoal: jest.fn(), updateGoal: jest.fn() },
}));

jest.mock("@/lib/confirm", () => ({ confirm: jest.fn().mockResolvedValue(true) }));
const confirmation = confirm as jest.MockedFunction<typeof confirm>;

const service = studentService as jest.Mocked<typeof studentService>;
const activeGoal: StudentGoal = { id: "goal-1", title: "Praticar 2h", type: "PRACTICE_TIME", target: 120, currentProgress: 30, status: "ACTIVE" };
const doneGoal: StudentGoal = { id: "goal-2", title: "Ler partitura", type: "OTHER", target: 5, currentProgress: 5, status: "COMPLETED" };

beforeEach(() => {
  jest.clearAllMocks();
  confirmation.mockResolvedValue(true);
  service.goals.mockImplementation((status) => Promise.resolve(status === "COMPLETED" ? [doneGoal] : [activeGoal]));
});

it("switches tabs from cached data and updates progress", async () => {
  await render(<Goals />);

  expect(await screen.findByText("30min / 2h")).toBeVisible();
  await fireEvent.press(screen.getByRole("tab", { name: "Concluídas" }));
  expect(screen.getByText("Ler partitura")).toBeVisible();
  expect(service.goals).toHaveBeenCalledTimes(2);

  await fireEvent.press(screen.getByRole("tab", { name: "Ativas" }));
  service.updateGoal.mockResolvedValue({ ...activeGoal, currentProgress: 120, status: "COMPLETED" });
  await fireEvent.press(screen.getByRole("button", { name: "Atualizar Praticar 2h" }));
  await fireEvent.changeText(screen.getByLabelText("Progresso atual (minutos)"), "120");
  await fireEvent.press(screen.getByRole("button", { name: "Salvar meta" }));

  expect(service.updateGoal).toHaveBeenCalledWith("goal-1", 120);
  expect(screen.queryByRole("button", { name: "Salvar meta" })).toBeNull();
});

it("validates a new goal before creating it", async () => {
  service.createGoal.mockResolvedValue(activeGoal);
  await render(<Goals />);
  await screen.findByText("Praticar 2h");

  await fireEvent.press(screen.getByRole("button", { name: "Nova meta" }));
  await fireEvent.press(screen.getByRole("button", { name: "Salvar meta" }));
  expect(screen.getByText("Informe um título.")).toBeVisible();
  expect(screen.getByText("Informe um objetivo maior que zero.")).toBeVisible();

  await fireEvent.changeText(screen.getByLabelText("Título"), "Aprender acordes");
  await fireEvent.press(screen.getByRole("radio", { name: "Outra" }));
  await fireEvent.changeText(screen.getByLabelText("Objetivo (unidades)"), "10");
  await fireEvent.press(screen.getByRole("button", { name: "Salvar meta" }));

  expect(service.createGoal).toHaveBeenCalledWith("Aprender acordes", "OTHER", 10, undefined);
});

it("submits only once while a keyboard save is pending", async () => {
  let resolveSave!: (goal: StudentGoal) => void;
  service.updateGoal.mockImplementationOnce(() => new Promise((resolve) => { resolveSave = resolve; }));
  await render(<Goals />);
  await fireEvent.press(await screen.findByRole("button", { name: "Atualizar Praticar 2h" }));
  const input = screen.getByLabelText("Progresso atual (minutos)");
  await fireEvent.changeText(input, "50");
  await act(() => { void input.props.onSubmitEditing(); void input.props.onSubmitEditing(); });
  expect(service.updateGoal).toHaveBeenCalledTimes(1);
  await fireEvent.press(screen.getByRole("button", { name: "Fechar", includeHiddenElements: true }));
  expect(confirmation).not.toHaveBeenCalled();
  await act(() => { resolveSave({ ...activeGoal, currentProgress: 50 }); });
  expect(screen.queryByRole("button", { name: "Salvar meta" })).toBeNull();
});

it.each(["Cancelar", "Fechar"])("confirms a dirty draft when closing via %s", async (label) => {
  confirmation.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
  await render(<Goals />);
  await screen.findByText("Praticar 2h");
  await fireEvent.press(screen.getByRole("button", { name: "Nova meta" }));
  await fireEvent.changeText(screen.getByLabelText("Título"), "Rascunho");
  await fireEvent.press(screen.getByRole("button", { name: label, includeHiddenElements: true }));
  expect(confirmation).toHaveBeenCalledTimes(1);
  expect(screen.getByLabelText("Título")).toHaveProp("value", "Rascunho");
  await fireEvent.press(screen.getByRole("button", { name: label, includeHiddenElements: true }));
  expect(screen.queryByRole("button", { name: "Salvar meta" })).toBeNull();
});
