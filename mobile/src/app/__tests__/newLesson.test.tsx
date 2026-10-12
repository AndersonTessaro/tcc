import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import NewLesson from "@/app/(teacher)/new-lesson";
import { teacherService, type LessonAvailability, type TeacherLesson } from "@/features/teacher/teacherService";
import { confirm } from "@/lib/confirm";
import { ApiError } from "@/lib/http/apiError";

const mockBack = jest.fn();
type RemoveEvent = { preventDefault: () => void; data: { action: { type: string } } };
let mockBeforeRemove: ((event: RemoveEvent) => void) | undefined;
const mockNavigation = {
  addListener: jest.fn((_name: string, listener: (event: RemoveEvent) => void) => {
    mockBeforeRemove = listener;
    return () => { mockBeforeRemove = undefined; };
  }),
  setOptions: jest.fn(),
  dispatch: mockBack,
};
const mockShow = jest.fn();
let mockParams: Record<string, string> = {};
jest.mock("expo-router", () => ({
  useNavigation: () => mockNavigation,
  useRouter: () => ({ back: () => {
    let prevented = false;
    mockBeforeRemove?.({ preventDefault: () => { prevented = true; }, data: { action: { type: "GO_BACK" } } });
    if (!prevented) mockBack();
  } }),
  useLocalSearchParams: () => mockParams,
  useFocusEffect: (callback: () => void) => require("react").useEffect(callback, [callback]),
}));
jest.mock("@/features/teacher/teacherService", () => ({
  teacherService: { enrollments: jest.fn(), newLesson: jest.fn(), availability: jest.fn(), attendance: jest.fn() },
}));
jest.mock("@/ui/DateTimeField", () => require("@/features/teacher/__tests__/dateTimeFieldStub"));
jest.mock("@/ui/Toast", () => ({ useToast: () => ({ show: mockShow }) }));
jest.mock("@/lib/confirm", () => ({ confirm: jest.fn().mockResolvedValue(true) }));

const service = teacherService as jest.Mocked<typeof teacherService>;
const confirmMock = confirm as jest.MockedFunction<typeof confirm>;

const free = (initialStatus: LessonAvailability["initialStatus"] = "DONE"): LessonAvailability => ({
  initialStatus, available: true, busy: [], conflicts: [], fulfilledSchedule: null,
});

const PAST_DATE = "2026-09-21";
const FUTURE_DATE = "2099-01-05";

async function pickAna() {
  await fireEvent.press(await screen.findByText("Ana Souza · Piano"));
}

describe("NewLesson screen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    confirmMock.mockResolvedValue(true);
    mockParams = {};
    service.enrollments.mockResolvedValue([
      { id: "enr-1", studentId: "st-1", studentName: "Ana Souza", instrument: "Piano" },
      { id: "enr-2", studentId: "st-2", studentName: "João Íris", instrument: "Violão" },
    ]);
    service.availability.mockResolvedValue(free());
    service.newLesson.mockResolvedValue({ id: "lesson-1", status: "DONE" } as TeacherLesson);
    service.attendance.mockResolvedValue({});
  });

  it("derives the end from the chosen duration and saves, then goes back", async () => {
    await render(<NewLesson />);
    await pickAna();
    await fireEvent.changeText(screen.getByLabelText("Data"), PAST_DATE);
    await fireEvent.changeText(screen.getByLabelText("Início"), "14:00");
    await fireEvent.press(screen.getByRole("radio", { name: "45 min" }));
    await fireEvent.changeText(screen.getByLabelText("Conteúdo trabalhado"), "  Escalas  ");
    await waitFor(() => expect(screen.getByRole("button", { name: "Registrar aula" })).toBeEnabled());
    await fireEvent.press(screen.getByRole("button", { name: "Registrar aula" }));

    await waitFor(() =>
      expect(service.newLesson).toHaveBeenCalledWith({
        enrollmentId: "enr-1",
        date: PAST_DATE,
        startTime: "14:00",
        endTime: "14:45",
        content: "Escalas",
        homework: undefined,
      }),
    );
    expect(mockShow).toHaveBeenCalledWith("Aula registrada como concluída", "success");
    expect(mockBack).toHaveBeenCalled();
  });

  it("checks the slot with the framework and lists every conflict, blocking the save", async () => {
    service.availability.mockResolvedValue({
      initialStatus: "SCHEDULED",
      available: false,
      busy: [],
      conflicts: [
        { referenceId: "l9", kind: "LESSON", party: "TEACHER", startTime: "10:30:00", endTime: "11:30:00", description: "Bia · Canto" },
        { referenceId: "s3", kind: "RECURRING", party: "STUDENT", startTime: "09:30:00", endTime: "10:30:00", description: "Horário fixo do aluno com outro professor" },
      ],
      fulfilledSchedule: null,
    });
    await render(<NewLesson />);
    await pickAna();
    await fireEvent.changeText(screen.getByLabelText("Data"), FUTURE_DATE);

    expect(await screen.findByText("2 conflitos neste horário")).toBeVisible();
    expect(screen.getByText(/10:30–11:30 · Bia · Canto/)).toBeVisible();
    await waitFor(() => expect(service.availability).toHaveBeenLastCalledWith("enr-1", FUTURE_DATE, "10:00", "11:00"));
    expect(screen.getByRole("button", { name: "Agendar aula" })).toBeDisabled();
  });

  it("offers the student's recurring schedule and free starts", async () => {
    service.availability.mockResolvedValue({
      ...free("SCHEDULED"),
      busy: [{ referenceId: "l1", kind: "LESSON", party: "TEACHER", startTime: "07:00:00", endTime: "08:00:00", description: "Bia · Canto" }],
      fulfilledSchedule: { referenceId: "s1", kind: "RECURRING", party: "BOTH", startTime: "15:00:00", endTime: "16:30:00", description: "Horário fixo · Ana Souza" },
    });
    await render(<NewLesson />);
    await pickAna();

    expect(await screen.findByText("Horário fixo deste aluno: 15:00–16:30")).toBeVisible();
    await fireEvent.press(screen.getByRole("button", { name: "Usar horário fixo" }));
    expect(screen.getByLabelText("Início")).toHaveProp("value", "15:00");
    expect(screen.getByRole("radio", { name: "1h30" })).toBeChecked();

    await fireEvent.press(await screen.findByRole("radio", { name: "Começar às 08:00" }));
    expect(screen.getByLabelText("Início")).toHaveProp("value", "08:00");
  });

  it("records attendance right away for a completed lesson", async () => {
    await render(<NewLesson />);
    await pickAna();
    await fireEvent.changeText(screen.getByLabelText("Data"), PAST_DATE);
    await fireEvent.press(await screen.findByRole("radio", { name: "Justificada" }));
    await fireEvent.changeText(screen.getByLabelText("Justificativa"), "Consulta médica");
    await waitFor(() => expect(screen.getByRole("button", { name: "Registrar aula" })).toBeEnabled());
    await fireEvent.press(screen.getByRole("button", { name: "Registrar aula" }));

    await waitFor(() => expect(service.attendance).toHaveBeenCalledWith("lesson-1", "EXCUSED", "Consulta médica"));
    expect(mockBack).toHaveBeenCalled();
  });

  it("explains that a future lesson starts scheduled and hides attendance", async () => {
    service.availability.mockResolvedValue(free("SCHEDULED"));
    await render(<NewLesson />);
    await pickAna();
    await fireEvent.changeText(screen.getByLabelText("Data"), FUTURE_DATE);

    expect(await screen.findByText(/a aula nasce agendada/)).toBeVisible();
    expect(screen.queryByRole("radio", { name: "Presente" })).toBeNull();
    await waitFor(() => expect(screen.getByRole("button", { name: "Agendar aula" })).toBeEnabled());
    await fireEvent.press(screen.getByRole("button", { name: "Agendar aula" }));
    await waitFor(() => expect(mockShow).toHaveBeenCalledWith("Aula agendada", "success"));
    expect(service.attendance).not.toHaveBeenCalled();
  });

  it("keeps a custom lesson length when the start moves", async () => {
    await render(<NewLesson />);
    await pickAna();
    await fireEvent.press(screen.getByRole("radio", { name: "Outro" }));
    await fireEvent.changeText(screen.getByLabelText("Fim"), "12:30");
    await fireEvent.changeText(screen.getByLabelText("Início"), "11:00");
    await waitFor(() => expect(screen.getByRole("button", { name: /aula$/ })).toBeEnabled());
    await fireEvent.press(screen.getByRole("button", { name: /aula$/ }));

    await waitFor(() => expect(service.newLesson).toHaveBeenCalledWith(expect.objectContaining({ startTime: "11:00", endTime: "13:30" })));
  });

  it("filters enrollments ignoring accents", async () => {
    await render(<NewLesson />);
    await screen.findByText("Ana Souza · Piano");
    await fireEvent.changeText(screen.getByLabelText("Buscar aluno ou instrumento"), "iris violao");
    expect(screen.queryByText("Ana Souza · Piano")).toBeNull();
    await fireEvent.changeText(screen.getByLabelText("Buscar aluno ou instrumento"), "violao");
    expect(screen.getByText("João Íris · Violão")).toBeVisible();
    expect(screen.queryByText("Ana Souza · Piano")).toBeNull();
  });

  it("preselects the student's only enrollment from the route", async () => {
    mockParams = { studentId: "st-2" };
    await render(<NewLesson />);
    await waitFor(() => expect(screen.getByRole("radio", { name: "João Íris · Violão" })).toBeChecked());
    expect(screen.queryByText("Ana Souza · Piano")).toBeNull();
  });

  it("validates inline without calling the API", async () => {
    await render(<NewLesson />);
    await screen.findByText("Ana Souza · Piano");
    await fireEvent.press(screen.getByRole("radio", { name: "Outro" }));
    await fireEvent.changeText(screen.getByLabelText("Fim"), "09:00");
    await fireEvent.press(screen.getByRole("button", { name: /aula$/ }));

    expect(await screen.findByText("Selecione o aluno")).toBeVisible();
    expect(screen.getByText("O fim deve ser depois do início")).toBeVisible();
    expect(service.newLesson).not.toHaveBeenCalled();
  });

  it("still shows a conflict the server finds at save time", async () => {
    service.newLesson.mockRejectedValue(new ApiError(409, "SCHEDULE_CONFLICT"));
    await render(<NewLesson />);
    await pickAna();
    await waitFor(() => expect(screen.getByRole("button", { name: /aula$/ })).toBeEnabled());
    await fireEvent.press(screen.getByRole("button", { name: /aula$/ }));

    const message = await screen.findByText("Conflito de horário com outra aula ou horário fixo");
    expect(message).toHaveProp("accessibilityRole", "alert");
    expect(mockBack).not.toHaveBeenCalled();
  });

  it("asks before discarding a filled form", async () => {
    confirmMock.mockResolvedValue(false);
    await render(<NewLesson />);
    await pickAna();
    await fireEvent.press(screen.getByRole("button", { name: "Voltar" }));

    await waitFor(() => expect(confirmMock).toHaveBeenCalledWith(expect.objectContaining({ destructive: true })));
    expect(mockBack).not.toHaveBeenCalled();
  });
});

it("blocks submission while checking a new slot and discards old availability", async () => {
  service.enrollments.mockResolvedValue([{ id: "enr-1", studentId: "st-1", studentName: "Ana Souza", instrument: "Piano" }]);
  service.availability.mockResolvedValueOnce(free()).mockImplementationOnce(() => new Promise(() => {}));
  mockParams = {};
  await render(<NewLesson />);
  await pickAna();
  await screen.findByText("Horário livre");
  await fireEvent.changeText(screen.getByLabelText("Data"), FUTURE_DATE);
  expect(screen.queryByText("Horário livre")).toBeNull();
  expect(screen.getByRole("button", { name: "Agendar aula" })).toBeDisabled();
  await fireEvent.press(screen.getByRole("button", { name: "Agendar aula" }));
  expect(service.newLesson).not.toHaveBeenCalled();
});
