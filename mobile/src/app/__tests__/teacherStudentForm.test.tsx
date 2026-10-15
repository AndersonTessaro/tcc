import { ScrollView, TextInput } from "react-native";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import StudentFormRoute from "@/app/teacher/student-form";
import { teacherService } from "@/features/teacher/teacherService";
import { ApiError } from "@/lib/http/apiError";
import { confirm } from "@/lib/confirm";

const mockBack = jest.fn();
const mockReplace = jest.fn();
const mockDispatch = jest.fn();
const mockToast = jest.fn();
let mockParams: { id?: string } = {};
let mockBeforeRemove: (event: unknown) => void;
const mockNavigation = { addListener: jest.fn((event, callback) => { if (event === "beforeRemove") mockBeforeRemove = callback; return jest.fn(); }), setOptions: jest.fn(), dispatch: mockDispatch };
jest.mock("expo-router", () => ({
  useLocalSearchParams: () => mockParams,
  useNavigation: () => mockNavigation,
  useRouter: () => ({ back: mockBack, replace: mockReplace }),
  useFocusEffect: (callback: () => void) => require("react").useEffect(callback, [callback]),
}));
jest.mock("@/lib/confirm", () => ({ confirm: jest.fn() }));
jest.mock("@/ui/Toast", () => ({ useToast: () => ({ show: mockToast }) }));
jest.mock("@/features/teacher/teacherService", () => ({ teacherService: { instruments: jest.fn(), studentProfile: jest.fn(), createStudent: jest.fn(), updateStudentProfile: jest.fn() } }));
const service = jest.mocked(teacherService);
const profile = { id: "s1", name: "Ana", email: "ana@example.com", username: "ana", phone: "45999991234", sharedNotes: "Estude escalas", privateNotes: "Revisar postura" };

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = {};
  service.instruments.mockReset().mockResolvedValue([{ id: "i1", name: "Violão" }]);
  service.studentProfile.mockReset().mockResolvedValue(profile);
  service.createStudent.mockReset().mockResolvedValue(profile);
  service.updateStudentProfile.mockReset().mockResolvedValue(profile);
  jest.mocked(confirm).mockResolvedValue(false);
});
const save = () => fireEvent.press(screen.getByRole("button", { name: mockParams.id ? "Salvar alterações" : "Cadastrar aluno" }));
async function fill() {
  await screen.findByLabelText("Nome");
  await fireEvent.changeText(screen.getByLabelText("Nome"), " Ana ");
  await fireEvent.changeText(screen.getByLabelText("E-mail"), " ana@example.com ");
  await fireEvent.changeText(screen.getByLabelText("Usuário (login)"), "ana");
  await fireEvent.changeText(screen.getByLabelText("Senha inicial"), " Senha123 ");
}
it("creates with a single preselected instrument, trims fields and preserves the password", async () => {
  await render(<StudentFormRoute />);
  await fill();
  expect(screen.getByRole("radio", { name: "Violão", checked: true })).toBeVisible();
  expect(screen.getByLabelText("Senha inicial")).toHaveProp("secureTextEntry", true);
  await fireEvent.changeText(screen.getByLabelText("Telefone (opcional)"), " 45999991234 ");
  await fireEvent.changeText(screen.getByLabelText("Observação para o aluno"), " Estude escalas ");
  await fireEvent.changeText(screen.getByLabelText("Anotações do professor"), " Revisar postura ");
  await save();
  expect(service.createStudent).toHaveBeenCalledWith({ name: "Ana", email: "ana@example.com", username: "ana", password: " Senha123 ", phone: "45999991234", instrumentId: "i1", sharedNotes: "Estude escalas", privateNotes: "Revisar postura" });
  expect(mockReplace).toHaveBeenCalledWith({ pathname: "/teacher/student/[id]", params: { id: "s1" } });
  expect(mockToast).toHaveBeenCalledWith("Aluno cadastrado.", "success");
  const event = { preventDefault: jest.fn(), data: { action: { type: "GO_BACK" } } };
  await act(() => mockBeforeRemove(event));
  expect(event.preventDefault).not.toHaveBeenCalled();
  expect(confirm).not.toHaveBeenCalled();
});
it("focuses and scrolls to the first invalid field without sending a request", async () => {
  const focus = jest.spyOn(TextInput.prototype, "focus");
  const scroll = jest.spyOn(ScrollView.prototype, "scrollTo");
  try {
    await render(<StudentFormRoute />);
    await fill();
    await fireEvent.changeText(screen.getByLabelText("E-mail"), "bad");
    await fireEvent(screen.getByLabelText("E-mail"), "layout", { nativeEvent: { layout: { y: 240 } } });
    await save();
    expect(screen.getByText("Informe um e-mail válido.")).toBeVisible();
    expect(screen.getByLabelText("E-mail")).toHaveProp("aria-invalid", true);
    expect(focus).toHaveBeenCalled();
    expect(scroll).toHaveBeenCalledWith({ y: 232, animated: true });
    expect(service.createStudent).not.toHaveBeenCalled();
  } finally { focus.mockRestore(); scroll.mockRestore(); }
});
it.each([
  [409, "DUPLICATE_RESOURCE", "Email already in use", "E-mail", "Este e-mail já está em uso."],
  [409, "DUPLICATE_RESOURCE", "Username already in use", "Usuário (login)", "Este usuário já está em uso."],
  [422, "DOMAIN_VALIDATION", "Teacher does not teach this instrument", "Instrumento", "O professor não ensina este instrumento"],
])("places API error on its field: %s %s %s", async (status, code, detail, label, message) => {
  service.createStudent.mockRejectedValue(new ApiError(status, code, detail));
  await render(<StudentFormRoute />);
  await fill();
  await save();
  expect(await screen.findByText(message)).toBeVisible();
  if (label !== "Instrumento") expect(screen.getByLabelText(label)).toHaveProp("aria-invalid", true);
  expect(mockReplace).not.toHaveBeenCalled();
});
it("requires choosing among multiple instruments", async () => {
  service.instruments.mockResolvedValue([{ id: "i1", name: "Violão" }, { id: "i2", name: "Piano" }]);
  await render(<StudentFormRoute />);
  await fill();
  await save();
  expect(screen.getByText("Escolha o instrumento.")).toBeVisible();
  await fireEvent.press(screen.getByRole("radio", { name: "Piano" }));
  await save();
  expect(service.createStudent).toHaveBeenCalledWith(expect.objectContaining({ instrumentId: "i2" }));
});
it("shows an empty state without a save action when there are no instruments", async () => {
  service.instruments.mockResolvedValue([]);
  await render(<StudentFormRoute />);
  expect(await screen.findByText("Você ainda não ensina nenhum instrumento cadastrado. Peça à administração.")).toBeVisible();
  expect(screen.queryByRole("button", { name: "Cadastrar aluno" })).toBeNull();
});
it("retries loading failures", async () => {
  service.instruments.mockRejectedValueOnce(new Error("offline"));
  await render(<StudentFormRoute />);
  expect(await screen.findByText("Não foi possível carregar o formulário.")).toBeVisible();
  await fireEvent.press(screen.getByRole("button", { name: "Tentar novamente" }));
  expect(await screen.findByLabelText("Nome")).toBeVisible();
});
it("loads edit mode without instruments, saves only editable fields and clears blank notes", async () => {
  mockParams = { id: "s1" };
  await render(<StudentFormRoute />);
  expect(await screen.findByDisplayValue("Ana")).toBeVisible();
  expect(screen.getByLabelText("E-mail")).toHaveProp("editable", false);
  expect(screen.getByLabelText("Usuário (login)")).toHaveProp("editable", false);
  expect(screen.queryByLabelText("Senha inicial")).toBeNull();
  expect(service.instruments).not.toHaveBeenCalled();
  await fireEvent.changeText(screen.getByLabelText("Nome"), " Ana Silva ");
  await fireEvent.changeText(screen.getByLabelText("Telefone (opcional)"), "");
  await fireEvent.changeText(screen.getByLabelText("Observação para o aluno"), " ");
  await fireEvent.changeText(screen.getByLabelText("Anotações do professor"), "");
  await save();
  expect(service.updateStudentProfile).toHaveBeenCalledWith("s1", { name: "Ana Silva", phone: null, sharedNotes: "", privateNotes: "" });
  expect(mockBack).toHaveBeenCalledTimes(1);
  expect(mockToast).toHaveBeenCalledWith("Alterações salvas.", "success");
  await act(() => mockBeforeRemove({ preventDefault: jest.fn(), data: { action: {} } }));
  expect(confirm).not.toHaveBeenCalled();
});
it("keeps ownership and validation errors in the form", async () => {
  mockParams = { id: "s1" };
  service.updateStudentProfile.mockRejectedValue(new ApiError(403, "OWNERSHIP_DENIED"));
  await render(<StudentFormRoute />);
  await screen.findByDisplayValue("Ana");
  await save();
  expect(await screen.findByText("Sem permissão para acessar este registro")).toBeVisible();
  expect(mockBack).not.toHaveBeenCalled();
});
it.each([false, true])("guards leaving a changed form in edit mode %s", async (edit) => {
  mockParams = edit ? { id: "s1" } : {};
  await render(<StudentFormRoute />);
  await screen.findByLabelText("Nome");
  const event = { preventDefault: jest.fn(), data: { action: { type: "GO_BACK" } } };
  await act(() => mockBeforeRemove(event));
  expect(confirm).not.toHaveBeenCalled();
  await fireEvent.changeText(screen.getByLabelText("Nome"), "Alteração");
  await fireEvent.press(screen.getByRole("button", { name: "Voltar" }));
  await act(() => mockBeforeRemove(event));
  expect(event.preventDefault).toHaveBeenCalled();
  expect(confirm).toHaveBeenCalledWith(expect.objectContaining({ title: "Descartar alterações?" }));
  expect(mockDispatch).not.toHaveBeenCalled();
  jest.mocked(confirm).mockResolvedValue(true);
  await act(() => mockBeforeRemove(event));
  expect(mockDispatch).toHaveBeenCalledWith(event.data.action);
});
it("disables all editable fields and prevents duplicate submissions while saving", async () => {
  let finish!: (value: typeof profile) => void;
  service.createStudent.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  await render(<StudentFormRoute />);
  await fill();
  await act(() => { void save(); });
  expect(screen.getByLabelText("Nome")).toHaveProp("editable", false);
  expect(screen.getByLabelText("Observação para o aluno")).toHaveProp("editable", false);
  expect(screen.getByLabelText("Anotações do professor")).toHaveProp("editable", false);
  expect(screen.getByRole("radio", { name: "Violão" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Cadastrar aluno" })).toBeDisabled();
  await save();
  expect(service.createStudent).toHaveBeenCalledTimes(1);
  await act(() => finish(profile));
  expect(mockReplace).toHaveBeenCalledTimes(1);
});

it("does not move focus while correcting a field after multiple validation errors", async () => {
  const focus = jest.spyOn(TextInput.prototype, "focus");
  try {
    await render(<StudentFormRoute />);
    await screen.findByLabelText("Nome");
    await save();
    expect(focus).toHaveBeenCalledTimes(1);
    await fireEvent.changeText(screen.getByLabelText("Nome"), "A");
    expect(focus).toHaveBeenCalledTimes(1);
  } finally { focus.mockRestore(); }
});

it("does not navigate or toast after leaving while a save is pending", async () => {
  let finish!: (value: typeof profile) => void;
  service.createStudent.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const rendered = await render(<StudentFormRoute />);
  await fill();
  await act(() => { void save(); });
  await rendered.unmount();
  await act(() => finish(profile));
  expect(mockReplace).not.toHaveBeenCalled();
  expect(mockBack).not.toHaveBeenCalled();
  expect(mockToast).not.toHaveBeenCalled();
});
