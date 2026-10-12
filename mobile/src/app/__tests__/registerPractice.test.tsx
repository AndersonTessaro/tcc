import { Platform } from "react-native";
import { fireEvent, render, screen } from "@testing-library/react-native";
import RegisterPractice from "@/app/(student)/practice/register";
import { studentService } from "@/features/student/studentService";
import { ApiError } from "@/lib/http/apiError";
import { todayIso } from "@/lib/format";

const mockBack = jest.fn();
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
jest.mock("expo-router", () => ({
  useNavigation: () => ({ addListener: jest.fn(() => jest.fn()), setOptions: jest.fn(), dispatch: jest.fn() }),
  useRouter: () => ({ push: jest.fn(), back: mockBack }),
  useFocusEffect: (callback: () => void) => require("react").useEffect(callback, [callback]),
}));
jest.mock("@/features/student/studentService", () => ({ studentService: { progress: jest.fn(), registerPractice: jest.fn() } }));

const service = studentService as jest.Mocked<typeof studentService>;

beforeEach(() => {
  Object.defineProperty(globalThis, "window", { configurable: true, value: { addEventListener: jest.fn(), removeEventListener: jest.fn() } });
  jest.clearAllMocks();
  service.progress.mockResolvedValue({ xpTotal: 90, level: 1, streakDays: 2, totalPracticeMin: 90 });
});

afterEach(() => {
  if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
  else Reflect.deleteProperty(globalThis, "window");
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

  await fireEvent.changeText(screen.getByLabelText("Tempo de prática em minutos"), "90");
  await fireEvent.press(screen.getByRole("button", { name: "Salvar registro" }));

  expect(await screen.findByText("Dados inválidos. Revise os campos.")).toBeVisible();
  expect(service.registerPractice).toHaveBeenCalledWith(90, undefined, todayIso());
  expect(mockBack).not.toHaveBeenCalled();
});


it("keeps date and duration editable and lets shortcuts fill them", async () => {
  const platform = jest.replaceProperty(Platform, "OS", "web");
  service.registerPractice.mockResolvedValue({ xpTotal: 180, level: 2, streakDays: 3, totalPracticeMin: 180 });
  try {
    await render(<RegisterPractice />);
    expect(screen.getByLabelText("Data")).toHaveProp("value", todayIso());
    expect(screen.getByLabelText("Tempo de prática em minutos")).toHaveProp("value", "30");
    await fireEvent.press(screen.getByRole("radio", { name: "Ontem" }));
    await fireEvent.press(screen.getByRole("radio", { name: "1h" }));
    expect(screen.getByLabelText("Tempo de prática em minutos")).toHaveProp("value", "60");
    expect(screen.getByLabelText("Data").props.value).not.toBe(todayIso());
    await fireEvent(screen.getByLabelText("Data"), "change", { currentTarget: { value: "2026-07-08" } });
    await fireEvent.changeText(screen.getByLabelText("Tempo de prática em minutos"), "90");
    await fireEvent.press(screen.getByRole("button", { name: "Salvar registro" }));
    expect(service.registerPractice).toHaveBeenCalledWith(90, undefined, "2026-07-08");
  } finally {
    platform.restore();
  }
});

it("validates date before minutes and rejects an oversized combined description", async () => {
  const platform = jest.replaceProperty(Platform, "OS", "web");
  try {
    await render(<RegisterPractice />);
    await fireEvent(screen.getByLabelText("Data"), "change", { currentTarget: { value: "invalid" } });
    await fireEvent.changeText(screen.getByLabelText("Tempo de prática em minutos"), "0");
    await fireEvent.press(screen.getByRole("button", { name: "Salvar registro" }));
    expect(screen.getByText("Escolha uma data até hoje.")).toBeVisible();
    expect(screen.getByText("Informe os minutos praticados (1 a 1440).")).toBeVisible();
    expect(service.registerPractice).not.toHaveBeenCalled();
    await fireEvent(screen.getByLabelText("Data"), "change", { currentTarget: { value: todayIso() } });
    await fireEvent.changeText(screen.getByLabelText("Tempo de prática em minutos"), "90");
    await fireEvent.changeText(screen.getByLabelText("O que praticou? (opcional)"), "a".repeat(255));
    await fireEvent.changeText(screen.getByLabelText("Dificuldade encontrada (opcional)"), "Acordes");
    await fireEvent.press(screen.getByRole("button", { name: "Salvar registro" }));
    expect(screen.getByText("Resuma a descrição para até 255 caracteres.")).toBeVisible();
    expect(service.registerPractice).not.toHaveBeenCalled();
  } finally {
    platform.restore();
  }
});
