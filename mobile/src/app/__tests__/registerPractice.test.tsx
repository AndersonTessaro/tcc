import { Platform } from "react-native";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import RegisterPractice from "@/app/(student)/practice/register";
import { studentService } from "@/features/student/studentService";
import { ApiError } from "@/lib/http/apiError";
import { todayIso } from "@/lib/format";
import * as DocumentPicker from "expo-document-picker";
import { RECORDING_MAX_BYTES } from "@/features/student/recording";

const mockBack = jest.fn();
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
jest.mock("expo-router", () => ({
  useNavigation: () => ({ addListener: jest.fn(() => jest.fn()), setOptions: jest.fn(), dispatch: jest.fn() }),
  useRouter: () => ({ push: jest.fn(), back: mockBack }),
  useFocusEffect: (callback: () => void) => require("react").useEffect(callback, [callback]),
}));
jest.mock("@/features/student/studentService", () => ({ studentService: { progress: jest.fn(), registerPractice: jest.fn(), uploadPracticeRecording: jest.fn() } }));

const mockToast = jest.fn();
jest.mock("@/ui/Toast", () => ({ useToast: () => ({ show: mockToast }) }));
jest.mock("expo-document-picker", () => ({ getDocumentAsync: jest.fn() }));
const picker = jest.mocked(DocumentPicker.getDocumentAsync);

const service = studentService as jest.Mocked<typeof studentService>;

beforeEach(() => {
  Object.defineProperty(globalThis, "window", { configurable: true, value: { addEventListener: jest.fn(), removeEventListener: jest.fn() } });
  jest.clearAllMocks();
  picker.mockReset();
  service.uploadPracticeRecording.mockReset();
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

const recording = { uri: "file:///practice.mp4", name: "Prática.mp4", size: RECORDING_MAX_BYTES };
const registered = { practiceId: "practice-1", xpTotal: 120, level: 2, streakDays: 3, totalPracticeMin: 120 };

async function chooseRecording() {
  picker.mockResolvedValueOnce({ canceled: false, assets: [recording] });
  await fireEvent.press(screen.getByRole("button", { name: "Escolher áudio ou vídeo" }));
}

it("chooses the recording and uploads after registration before celebrating", async () => {
  service.registerPractice.mockResolvedValue(registered);
  let finishUpload!: (value: Awaited<ReturnType<typeof studentService.uploadPracticeRecording>>) => void;
  service.uploadPracticeRecording.mockImplementation(() => new Promise((resolve) => { finishUpload = resolve; }));
  await render(<RegisterPractice />);
  await chooseRecording();
  expect(screen.getByText("Prática.mp4 · 50,0 MB")).toBeVisible();
  expect(picker).toHaveBeenCalledWith({ type: ["audio/*", "video/*"], copyToCacheDirectory: true });
  await act(() => { void fireEvent.press(screen.getByRole("button", { name: "Salvar registro" })); });
  expect(service.uploadPracticeRecording).toHaveBeenCalledWith("practice-1", recording);
  expect(screen.getByRole("button", { name: "Enviando arquivo…" })).toBeDisabled();
  expect(screen.getByLabelText("Tempo de prática em minutos")).toHaveProp("editable", false);
  expect(screen.getByRole("radio", { name: "45 min" })).toBeDisabled();
  expect(screen.queryByText("+30 XP")).toBeNull();
  await act(() => finishUpload({ id: "practice-1", date: todayIso(), durationMin: 30, notes: null, recording: null }));
  expect(await screen.findByText("+30 XP")).toBeVisible();
  expect(service.registerPractice).toHaveBeenCalledTimes(1);
});

it("retries only the upload, preserving XP after multiple failures", async () => {
  service.registerPractice.mockResolvedValue(registered);
  service.uploadPracticeRecording.mockRejectedValue(new Error("offline"));
  await render(<RegisterPractice />);
  await chooseRecording();
  await fireEvent.press(screen.getByRole("button", { name: "Salvar registro" }));
  expect(await screen.findByText("A prática foi salva, mas o arquivo não foi enviado.")).toBeVisible();
  await fireEvent.press(screen.getByRole("button", { name: "Tentar enviar de novo" }));
  expect(service.registerPractice).toHaveBeenCalledTimes(1);
  expect(service.uploadPracticeRecording).toHaveBeenCalledTimes(2);
  service.uploadPracticeRecording.mockResolvedValue({ id: "practice-1", date: todayIso(), durationMin: 30, notes: null, recording: null });
  await fireEvent.press(screen.getByRole("button", { name: "Tentar enviar de novo" }));
  expect(await screen.findByText("+30 XP")).toBeVisible();
  expect(service.registerPractice).toHaveBeenCalledTimes(1);
  expect(service.uploadPracticeRecording).toHaveBeenCalledTimes(3);
});

it("continues without a recording after an upload failure", async () => {
  service.registerPractice.mockResolvedValue(registered);
  service.uploadPracticeRecording.mockRejectedValue(new ApiError(413, "FILE_TOO_LARGE"));
  await render(<RegisterPractice />);
  await chooseRecording();
  await fireEvent.press(screen.getByRole("button", { name: "Salvar registro" }));
  expect(await screen.findByText("Arquivo maior que 50 MB")).toBeVisible();
  await fireEvent.press(screen.getByRole("button", { name: "Continuar sem arquivo" }));
  expect(await screen.findByText("+30 XP")).toBeVisible();
  expect(service.registerPractice).toHaveBeenCalledTimes(1);
  expect(service.uploadPracticeRecording).toHaveBeenCalledTimes(1);
});

it("rejects an oversized selection without saving or uploading", async () => {
  picker.mockResolvedValue({ canceled: false, assets: [{ ...recording, size: RECORDING_MAX_BYTES + 1 }] });
  await render(<RegisterPractice />);
  await fireEvent.press(screen.getByRole("button", { name: "Escolher áudio ou vídeo" }));
  expect(screen.getByText("O arquivo passa de 50 MB. Grave um vídeo mais curto ou envie só o áudio.")).toBeVisible();
  await fireEvent.press(screen.getByRole("button", { name: "Salvar registro" }));
  expect(service.registerPractice).not.toHaveBeenCalled();
  expect(service.uploadPracticeRecording).not.toHaveBeenCalled();
});

it("removes the selected file and saves without an upload", async () => {
  service.registerPractice.mockResolvedValue(registered);
  await render(<RegisterPractice />);
  await chooseRecording();
  await fireEvent.press(screen.getByRole("button", { name: "Remover gravação Prática.mp4" }));
  expect(screen.queryByText("Prática.mp4 · 50,0 MB")).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: "Salvar registro" }));
  expect(await screen.findByText("+30 XP")).toBeVisible();
  expect(service.uploadPracticeRecording).not.toHaveBeenCalled();
});

it("keeps the selection when canceled and reports picker failures", async () => {
  await render(<RegisterPractice />);
  await chooseRecording();
  picker.mockResolvedValueOnce({ canceled: true, assets: null });
  await fireEvent.press(screen.getByRole("button", { name: "Trocar gravação Prática.mp4" }));
  expect(screen.getByText("Prática.mp4 · 50,0 MB")).toBeVisible();
  picker.mockRejectedValueOnce(new Error("unavailable"));
  await fireEvent.press(screen.getByRole("button", { name: "Trocar gravação Prática.mp4" }));
  expect(mockToast).toHaveBeenCalledWith("Não foi possível abrir o seletor de arquivos.", "error");
});

it("prevents duplicate registration during an in-flight save", async () => {
  let finishRegistration!: (value: typeof registered) => void;
  service.registerPractice.mockImplementationOnce(() => new Promise((resolve) => { finishRegistration = resolve; }));
  await render(<RegisterPractice />);
  const button = screen.getByRole("button", { name: "Salvar registro" });
  await act(() => { void fireEvent.press(button); });
  await fireEvent.press(button);
  expect(service.registerPractice).toHaveBeenCalledTimes(1);
  await act(() => finishRegistration(registered));
  expect(await screen.findByText("+30 XP")).toBeVisible();
});
