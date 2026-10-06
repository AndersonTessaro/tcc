import { fireEvent, render, screen } from "@testing-library/react-native";
import RegisterPractice from "@/app/(student)/practice/register";
import { studentService } from "@/features/student/studentService";
import { ApiError } from "@/lib/http/apiError";
import { todayIso } from "@/lib/format";

const mockBack = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), back: mockBack }),
  useFocusEffect: (callback: () => void) => require("react").useEffect(callback, [callback]),
}));
jest.mock("@/features/student/studentService", () => ({ studentService: { progress: jest.fn(), registerPractice: jest.fn() } }));

const service = studentService as jest.Mocked<typeof studentService>;

beforeEach(() => {
  jest.clearAllMocks();
  service.progress.mockResolvedValue({ xpTotal: 90, level: 1, streakDays: 2, totalPracticeMin: 90 });
});

it("registers a preset duration and celebrates XP, level up and streak", async () => {
  service.registerPractice.mockResolvedValue({ xpTotal: 135, level: 2, streakDays: 3, totalPracticeMin: 135 });
  await render(<RegisterPractice />);

  await fireEvent.press(screen.getByRole("radio", { name: "45 min" }));
  await fireEvent.changeText(screen.getByLabelText("O que praticou? (opcional)"), "Escalas");
  await fireEvent.press(screen.getByRole("radio", { name: "Avaliação 4 de 5" }));
  await fireEvent.press(screen.getByRole("button", { name: "Salvar registro" }));

  expect(await screen.findByText("+45 XP")).toBeVisible();
  expect(screen.getByText("Subiu para o nível 2!")).toBeVisible();
  expect(screen.getByText("Sequência: 3 dias")).toBeVisible();
  expect(service.registerPractice).toHaveBeenCalledWith(45, "Escalas; Avaliação: 4/5", todayIso());

  await fireEvent.press(screen.getByRole("button", { name: "Concluir" }));
  expect(mockBack).toHaveBeenCalled();
});

it("validates a custom duration and shows the API error without leaving the form", async () => {
  service.registerPractice.mockRejectedValue(new ApiError(400, "VALIDATION"));
  await render(<RegisterPractice />);

  await fireEvent.press(screen.getByRole("radio", { name: "Outro" }));
  await fireEvent.press(screen.getByRole("button", { name: "Salvar registro" }));
  expect(screen.getByText("Informe os minutos praticados (1 a 1440).")).toBeVisible();
  expect(service.registerPractice).not.toHaveBeenCalled();

  await fireEvent.changeText(screen.getByLabelText("Minutos praticados"), "90");
  await fireEvent.press(screen.getByRole("button", { name: "Salvar registro" }));

  expect(await screen.findByText("Dados inválidos. Revise os campos.")).toBeVisible();
  expect(service.registerPractice).toHaveBeenCalledWith(90, undefined, todayIso());
  expect(mockBack).not.toHaveBeenCalled();
});
