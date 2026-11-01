import { Platform } from "react-native";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import RegisterPractice from "@/app/(student)/practice/register";
import { studentService } from "@/features/student/studentService";
import { ApiError } from "@/lib/http/apiError";
import { addDays, todayIso } from "@/lib/format";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { AUDIO_RECORDING_MAX_BYTES, VIDEO_RECORDING_MAX_BYTES } from "@/features/student/recording";

const mockBack = jest.fn();
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
jest.mock("expo-router", () => ({
  useNavigation: () => ({ addListener: jest.fn(() => jest.fn()), setOptions: jest.fn(), dispatch: jest.fn() }),
  useRouter: () => ({ canGoBack: () => true, push: jest.fn(), back: mockBack }),
  useFocusEffect: (callback: () => void) => require("react").useEffect(callback, [callback]),
}));
jest.mock("@/features/student/studentService", () => ({ studentService: { progress: jest.fn(), registerPractice: jest.fn(), uploadPracticeRecording: jest.fn() } }));

const mockToast = jest.fn();
jest.mock("@/ui/Toast", () => ({ useToast: () => ({ show: mockToast }) }));
jest.mock("expo-document-picker", () => ({ getDocumentAsync: jest.fn() }));
jest.mock("expo-image-picker", () => ({ requestMediaLibraryPermissionsAsync: jest.fn(), launchImageLibraryAsync: jest.fn() }));
const picker = jest.mocked(DocumentPicker.getDocumentAsync);
const gallery = jest.mocked(ImagePicker.launchImageLibraryAsync);
const permission = jest.mocked(ImagePicker.requestMediaLibraryPermissionsAsync);

const service = studentService as jest.Mocked<typeof studentService>;

beforeEach(() => {
  Object.defineProperty(globalThis, "window", { configurable: true, value: { addEventListener: jest.fn(), removeEventListener: jest.fn() } });
  jest.clearAllMocks();
  picker.mockReset();
  gallery.mockReset();
  permission.mockReset();
  permission.mockResolvedValue({ granted: true, status: "granted" as ImagePicker.PermissionStatus, canAskAgain: true, expires: "never" });
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
  expect(service.registerPractice).toHaveBeenCalledWith({ durationMin: 45, notes: "Escalas", rating: 4, date: todayIso() });

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
  expect(service.registerPractice).toHaveBeenCalledWith({ durationMin: 90, date: todayIso() });
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
    await fireEvent(screen.getByLabelText("Data"), "change", { currentTarget: { value: addDays(todayIso(), -31) } });
    await fireEvent.press(screen.getByRole("button", { name: "Salvar registro" }));
    expect(screen.getByText("Só dá para registrar práticas dos últimos 30 dias.")).toBeVisible();
    expect(service.registerPractice).not.toHaveBeenCalled();

    await fireEvent(screen.getByLabelText("Data"), "change", { currentTarget: { value: addDays(todayIso(), -10) } });
    await fireEvent.changeText(screen.getByLabelText("Tempo de prática em minutos"), "90");
    await fireEvent.press(screen.getByRole("button", { name: "Salvar registro" }));
    expect(service.registerPractice).toHaveBeenCalledWith({ durationMin: 90, date: addDays(todayIso(), -10) });
  } finally {
    platform.restore();
  }
});

it("validates date before minutes and rejects oversized activity notes", async () => {
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
    await fireEvent.changeText(screen.getByLabelText("O que praticou? (opcional)"), "a".repeat(256));
    await fireEvent.changeText(screen.getByLabelText("Dificuldade encontrada (opcional)"), "Acordes");
    await fireEvent.press(screen.getByRole("button", { name: "Salvar registro" }));
    expect(screen.getByText("Resuma a descrição para até 255 caracteres.")).toBeVisible();
    expect(service.registerPractice).not.toHaveBeenCalled();
  } finally {
    platform.restore();
  }
});

it("saves 255 activity characters with separate trimmed difficulty and rating", async () => {
  service.registerPractice.mockResolvedValue({ practiceId: "practice-1", xpTotal: 120, level: 1, streakDays: 3, totalPracticeMin: 120 });
  await render(<RegisterPractice />);
  await fireEvent.changeText(screen.getByLabelText("O que praticou? (opcional)"), "  " + "a".repeat(255) + "  ");
  await fireEvent.changeText(screen.getByLabelText("Dificuldade encontrada (opcional)"), "  troca; ritmo  ");
  await fireEvent.press(screen.getByRole("radio", { name: "Avaliação 5 de 5" }));
  await fireEvent.press(screen.getByRole("button", { name: "Salvar registro" }));
  expect(await screen.findByText("+30 XP")).toBeVisible();
  expect(service.registerPractice).toHaveBeenCalledWith({ durationMin: 30, notes: "a".repeat(255), difficulty: "troca; ritmo", rating: 5, date: todayIso() });
  expect(screen.queryByText("Resuma a descrição para até 255 caracteres.")).toBeNull();
});

it("omits blank notes and difficulty and an unselected rating", async () => {
  service.registerPractice.mockResolvedValue({ practiceId: "practice-1", xpTotal: 120, level: 1, streakDays: 3, totalPracticeMin: 120 });
  await render(<RegisterPractice />);
  await fireEvent.changeText(screen.getByLabelText("O que praticou? (opcional)"), "  ");
  await fireEvent.changeText(screen.getByLabelText("Dificuldade encontrada (opcional)"), "  ");
  await fireEvent.press(screen.getByRole("button", { name: "Salvar registro" }));
  expect(await screen.findByText("+30 XP")).toBeVisible();
  expect(service.registerPractice).toHaveBeenCalledWith({ durationMin: 30, date: todayIso(), notes: undefined, difficulty: undefined, rating: undefined });
});

const recording = { uri: "file:///practice.m4a", name: "Prática.m4a", size: AUDIO_RECORDING_MAX_BYTES };
const video: ImagePicker.ImagePickerAsset = { uri: "file:///practice.mp4", fileName: "Prática.mp4", fileSize: VIDEO_RECORDING_MAX_BYTES, mimeType: "video/mp4", width: 1920, height: 1080 };
const registered = { practiceId: "practice-1", xpTotal: 120, level: 2, streakDays: 3, totalPracticeMin: 120 };

async function chooseRecording() {
  picker.mockResolvedValueOnce({ canceled: false, assets: [recording] });
  await fireEvent.press(screen.getByRole("button", { name: "Arquivo de áudio" }));
}

it("chooses the recording and uploads after registration before celebrating", async () => {
  service.registerPractice.mockResolvedValue(registered);
  let finishUpload!: (value: Awaited<ReturnType<typeof studentService.uploadPracticeRecording>>) => void;
  service.uploadPracticeRecording.mockImplementation(() => new Promise((resolve) => { finishUpload = resolve; }));
  await render(<RegisterPractice />);
  await chooseRecording();
  expect(screen.getByText("Prática.m4a · 50,0 MB")).toBeVisible();
  expect(picker).toHaveBeenCalledWith({ type: "audio/*", copyToCacheDirectory: true });
  await act(() => { void fireEvent.press(screen.getByRole("button", { name: "Salvar registro" })); });
  expect(service.uploadPracticeRecording).toHaveBeenCalledWith("practice-1", recording);
  expect(screen.getByRole("button", { name: "Enviando arquivo…" })).toBeDisabled();
  expect(screen.getByLabelText("Tempo de prática em minutos")).toHaveProp("editable", false);
  expect(screen.getByRole("radio", { name: "45 min" })).toBeDisabled();
  expect(screen.queryByText("+30 XP")).toBeNull();
  await act(() => finishUpload({ id: "practice-1", date: todayIso(), durationMin: 30, notes: null, difficulty: null, rating: null, recording: null }));
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
  service.uploadPracticeRecording.mockResolvedValue({ id: "practice-1", date: todayIso(), durationMin: 30, notes: null, difficulty: null, rating: null, recording: null });
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

it("rejects audio over 50 MB without saving or uploading", async () => {
  picker.mockResolvedValue({ canceled: false, assets: [{ ...recording, size: AUDIO_RECORDING_MAX_BYTES + 1 }] });
  await render(<RegisterPractice />);
  await fireEvent.press(screen.getByRole("button", { name: "Arquivo de áudio" }));
  expect(screen.getByText("O áudio passa de 50 MB. Envie um arquivo menor.")).toBeVisible();
  await fireEvent.press(screen.getByRole("button", { name: "Salvar registro" }));
  expect(service.registerPractice).not.toHaveBeenCalled();
  expect(service.uploadPracticeRecording).not.toHaveBeenCalled();
});

it("removes the selected file and saves without an upload", async () => {
  service.registerPractice.mockResolvedValue(registered);
  await render(<RegisterPractice />);
  await chooseRecording();
  await fireEvent.press(screen.getByRole("button", { name: "Remover gravação Prática.m4a" }));
  expect(screen.queryByText("Prática.m4a · 50,0 MB")).toBeNull();
  expect(screen.getByRole("button", { name: "Vídeo da galeria" })).toBeVisible();
  expect(screen.getByRole("button", { name: "Arquivo de áudio" })).toBeVisible();
  await fireEvent.press(screen.getByRole("button", { name: "Salvar registro" }));
  expect(await screen.findByText("+30 XP")).toBeVisible();
  expect(service.uploadPracticeRecording).not.toHaveBeenCalled();
});

it("keeps the selection when canceled and reports picker failures", async () => {
  await render(<RegisterPractice />);
  await chooseRecording();
  picker.mockResolvedValueOnce({ canceled: true, assets: null });
  await fireEvent.press(screen.getByRole("button", { name: "Trocar gravação Prática.m4a" }));
  expect(screen.getByText("Prática.m4a · 50,0 MB")).toBeVisible();
  picker.mockRejectedValueOnce(new Error("unavailable"));
  await fireEvent.press(screen.getByRole("button", { name: "Trocar gravação Prática.m4a" }));
  expect(mockToast).toHaveBeenCalledWith("Não foi possível abrir o seletor de arquivos.", "error");
  expect(gallery).not.toHaveBeenCalled();
});

it("accepts a gallery video up to 150 MB and uploads it after registration", async () => {
  gallery.mockResolvedValueOnce({ canceled: false, assets: [video] });
  service.registerPractice.mockResolvedValue(registered);
  service.uploadPracticeRecording.mockResolvedValue({ id: "practice-1", date: todayIso(), durationMin: 30, notes: null, difficulty: null, rating: null, recording: null });
  await render(<RegisterPractice />);
  expect(screen.getByText("Vídeo até 150 MB · áudio até 50 MB.")).toBeVisible();
  await fireEvent.press(screen.getByRole("button", { name: "Vídeo da galeria" }));
  expect(permission).toHaveBeenCalledTimes(1);
  expect(gallery).toHaveBeenCalledWith({ mediaTypes: ["videos"], allowsEditing: false, quality: 1 });
  expect(screen.getByText("Prática.mp4 · 150,0 MB")).toBeVisible();
  await fireEvent.press(screen.getByRole("button", { name: "Salvar registro" }));
  expect(service.uploadPracticeRecording).toHaveBeenCalledWith("practice-1", {
    uri: video.uri, name: video.fileName, mimeType: video.mimeType, size: video.fileSize, file: undefined,
  });
  expect(await screen.findByText("+30 XP")).toBeVisible();
  expect(picker).not.toHaveBeenCalled();
});

it("rejects video over 150 MB without saving or uploading", async () => {
  gallery.mockResolvedValueOnce({ canceled: false, assets: [{ ...video, fileSize: VIDEO_RECORDING_MAX_BYTES + 1 }] });
  await render(<RegisterPractice />);
  await fireEvent.press(screen.getByRole("button", { name: "Vídeo da galeria" }));
  expect(screen.getByText("O vídeo passa de 150 MB. Grave um vídeo mais curto.")).toBeVisible();
  await fireEvent.press(screen.getByRole("button", { name: "Salvar registro" }));
  expect(service.registerPractice).not.toHaveBeenCalled();
  expect(service.uploadPracticeRecording).not.toHaveBeenCalled();
});

it("shows a toast when gallery permission is denied and releases the picker", async () => {
  permission.mockResolvedValueOnce({ granted: false, status: "denied" as ImagePicker.PermissionStatus, canAskAgain: false, expires: "never" });
  await render(<RegisterPractice />);
  await fireEvent.press(screen.getByRole("button", { name: "Vídeo da galeria" }));
  expect(mockToast).toHaveBeenCalledWith("Permita o acesso à galeria para escolher um vídeo.", "error");
  expect(gallery).not.toHaveBeenCalled();
  await chooseRecording();
  expect(screen.getByText("Prática.m4a · 50,0 MB")).toBeVisible();
});

it.each([
  [{ fileName: "clip", mimeType: "video/quicktime" }, "clip.mov", "video/quicktime"],
  [{ fileName: "clip.unknown", mimeType: "video/mp4" }, "clip.unknown.mp4", "video/mp4"],
  [{ fileName: null, uri: "blob:practice/clip", mimeType: undefined }, "clip.mp4", "video/mp4"],
  [{ fileName: null, uri: "file:///practice.MOV", mimeType: "video/quicktime" }, "practice.MOV", "video/quicktime"],
])("normalizes gallery filenames and preserves the web file (%j)", async (overrides, name, mimeType) => {
  const webFile = new File(["video"], "clip", { type: mimeType });
  const asset = { ...video, ...overrides, file: webFile };
  gallery.mockResolvedValueOnce({ canceled: false, assets: [asset] });
  service.registerPractice.mockResolvedValue(registered);
  service.uploadPracticeRecording.mockRejectedValueOnce(new Error("offline"));
  await render(<RegisterPractice />);
  await fireEvent.press(screen.getByRole("button", { name: "Vídeo da galeria" }));
  await fireEvent.press(screen.getByRole("button", { name: "Salvar registro" }));
  expect(service.uploadPracticeRecording).toHaveBeenCalledWith("practice-1", {
    uri: asset.uri, name, mimeType, size: asset.fileSize, file: webFile,
  });
});

it("reopens the gallery for video replacement, keeps canceled selections and removes videos", async () => {
  gallery.mockResolvedValueOnce({ canceled: false, assets: [video] });
  await render(<RegisterPractice />);
  await fireEvent.press(screen.getByRole("button", { name: "Vídeo da galeria" }));
  gallery.mockResolvedValueOnce({ canceled: true, assets: null });
  await fireEvent.press(screen.getByRole("button", { name: "Trocar gravação Prática.mp4" }));
  expect(gallery).toHaveBeenCalledTimes(2);
  expect(screen.getByText("Prática.mp4 · 150,0 MB")).toBeVisible();
  expect(picker).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole("button", { name: "Remover gravação Prática.mp4" }));
  expect(screen.getByRole("button", { name: "Vídeo da galeria" })).toBeVisible();
  expect(screen.getByRole("button", { name: "Arquivo de áudio" })).toBeVisible();
});

it("locks both sources and saving while the gallery is open", async () => {
  let finishPicking!: (value: ImagePicker.ImagePickerResult) => void;
  gallery.mockImplementationOnce(() => new Promise((resolve) => { finishPicking = resolve; }));
  await render(<RegisterPractice />);
  await act(() => { void fireEvent.press(screen.getByRole("button", { name: "Vídeo da galeria" })); });
  expect(screen.getByRole("button", { name: "Vídeo da galeria" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Arquivo de áudio" })).toBeDisabled();
  await fireEvent.press(screen.getByRole("button", { name: "Arquivo de áudio" }));
  await fireEvent.press(screen.getByRole("button", { name: "Salvar registro" }));
  expect(picker).not.toHaveBeenCalled();
  expect(service.registerPractice).not.toHaveBeenCalled();
  await act(() => finishPicking({ canceled: true, assets: null }));
  expect(screen.getByRole("button", { name: "Arquivo de áudio" })).toBeEnabled();
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
