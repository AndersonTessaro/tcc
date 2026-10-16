import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { toast } from "sonner";
import { adminService } from "../adminService";
import { ApiError } from "@/lib/http/apiError";
import Enrollments from "./Enrollments";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("../adminService", () => ({ adminService: {
  enrollments: vi.fn(), students: vi.fn(), teachers: vi.fn(), instruments: vi.fn(),
  createEnrollment: vi.fn(), setEnrollmentStatus: vi.fn(), setEnrollmentFee: vi.fn(),
} }));
const service = vi.mocked(adminService);
const piano = { id: "in-1", name: "Piano" };
const teacher = { id: "te-1", name: "Carlos Lima", username: "carlos", instruments: [piano] };
const student = { id: "st-1", name: "Ana Souza", username: "ana" };
const enrollment = { id: "en-1", student, teacher, instrument: piano, classLabel: "Piano - Iniciantes",
  status: "ACTIVE" as const, monthlyFee: 150.5 };

describe("Enrollments page", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    service.enrollments.mockResolvedValue([enrollment]);
    service.students.mockResolvedValue([student]);
    service.teachers.mockResolvedValue([teacher, { ...teacher, id: "te-2", name: "Bia", instruments: [] }]);
    service.instruments.mockResolvedValue([piano]);
    service.createEnrollment.mockResolvedValue({ id: "en-2" });
    service.setEnrollmentStatus.mockResolvedValue(undefined);
    service.setEnrollmentFee.mockResolvedValue(undefined);
  });

  it("loads active enrollments and combines status and text filters", async () => {
    render(<Enrollments />);
    expect(await screen.findByText("Piano - Iniciantes")).toBeInTheDocument();
    expect(service.enrollments).toHaveBeenCalledWith("ACTIVE");
    expect(screen.getByText(/150,50/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Buscar matrículas"), { target: { value: "missing" } });
    expect(screen.getByText("Nenhuma matrícula encontrada")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Buscar matrículas"), { target: { value: "carlos" } });
    expect(screen.getByText("Piano - Iniciantes")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Filtrar por status"), { target: { value: "SUSPENDED" } });
    await waitFor(() => expect(service.enrollments).toHaveBeenLastCalledWith("SUSPENDED"));
    fireEvent.change(screen.getByLabelText("Filtrar por status"), { target: { value: "" } });
    await waitFor(() => expect(service.enrollments).toHaveBeenLastCalledWith(undefined));
  });

  it("updates status and confirms closure before saving", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<Enrollments />);
    await screen.findByText("Piano - Iniciantes");
    fireEvent.change(screen.getByLabelText("Status de Ana Souza"), { target: { value: "CLOSED" } });
    expect(confirm).toHaveBeenCalled();
    expect(service.setEnrollmentStatus).not.toHaveBeenCalled();
    confirm.mockReturnValue(true);
    fireEvent.change(screen.getByLabelText("Status de Ana Souza"), { target: { value: "CLOSED" } });
    await waitFor(() => expect(service.setEnrollmentStatus).toHaveBeenCalledWith("en-1", "CLOSED"));
    await waitFor(() => expect(service.enrollments).toHaveBeenCalledTimes(2));
    confirm.mockRestore();
  });

  it("edits the fee including clearing and zero", async () => {
    render(<Enrollments />);
    await screen.findByText("Piano - Iniciantes");
    for (const [input, expected] of [["200.75", 200.75], ["", null], ["0", 0]] as const) {
      fireEvent.change(screen.getByLabelText("Mensalidade de Ana Souza"), { target: { value: input } });
      fireEvent.click(screen.getByRole("button", { name: "Salvar mensalidade de Ana Souza" }));
      await waitFor(() => expect(service.setEnrollmentFee).toHaveBeenLastCalledWith("en-1", expected));
      await waitFor(() => expect(screen.getByRole("button", { name: "Salvar mensalidade de Ana Souza" })).toBeEnabled());
    }
  });

  it("creates with fee and resets an incompatible instrument when teacher changes", async () => {
    render(<Enrollments />);
    await screen.findByRole("option", { name: "Ana Souza (ana)" });
    fireEvent.change(screen.getByLabelText("Aluno"), { target: { value: "st-1" } });
    fireEvent.change(screen.getByLabelText("Professor"), { target: { value: "te-1" } });
    fireEvent.change(screen.getByLabelText("Instrumento"), { target: { value: "in-1" } });
    fireEvent.change(screen.getByLabelText("Professor"), { target: { value: "te-2" } });
    expect(within(screen.getByLabelText("Instrumento")).queryByRole("option", { name: "Piano" })).toBeNull();
    expect(screen.getByLabelText("Instrumento")).toHaveValue("");
    fireEvent.change(screen.getByLabelText("Professor"), { target: { value: "te-1" } });
    fireEvent.change(screen.getByLabelText("Instrumento"), { target: { value: "in-1" } });
    fireEvent.change(screen.getByLabelText("Mensalidade (opcional)"), { target: { value: "120.50" } });
    fireEvent.click(screen.getByRole("button", { name: "Criar matrícula" }));
    await waitFor(() => expect(service.createEnrollment).toHaveBeenCalledWith({
      studentId: "st-1", teacherId: "te-1", instrumentId: "in-1", monthlyFee: 120.5,
    }));
  });

  it("rejects incomplete creation and shows translated mutation errors", async () => {
    service.setEnrollmentStatus.mockRejectedValue(new ApiError(409, "DUPLICATE_RESOURCE", "Duplicate"));
    render(<Enrollments />);
    await screen.findByText("Piano - Iniciantes");
    fireEvent.click(screen.getByRole("button", { name: "Criar matrícula" }));
    expect(service.createEnrollment).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Status de Ana Souza"), { target: { value: "SUSPENDED" } });
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Já existe um cadastro com esses dados"));
  });

  it("shows loading and translated load failure", async () => {
    service.enrollments.mockRejectedValue(new TypeError("offline"));
    render(<Enrollments />);
    expect(screen.getAllByText("Carregando...").length).toBeGreaterThan(0);
    expect(await screen.findByRole("alert")).toHaveTextContent("Sem conexão com o servidor");
    expect(screen.queryByText("Nenhuma matrícula encontrada")).toBeNull();
  });

  it("keeps the current filter when an earlier mutation finishes", async () => {
    let finish!: () => void;
    service.setEnrollmentStatus.mockImplementation(() => new Promise<void>((resolve) => { finish = resolve; }));
    service.enrollments.mockImplementation(async (status) => status === "ACTIVE" ? [enrollment] : []);
    render(<Enrollments />);
    await screen.findByText("Piano - Iniciantes");
    fireEvent.change(screen.getByLabelText("Status de Ana Souza"), { target: { value: "SUSPENDED" } });
    fireEvent.change(screen.getByLabelText("Filtrar por status"), { target: { value: "CLOSED" } });
    await screen.findByText("Nenhuma matrícula encontrada");
    await act(async () => { finish(); });
    await waitFor(() => expect(service.enrollments).toHaveBeenCalledTimes(3));
    expect(service.enrollments).toHaveBeenLastCalledWith("CLOSED");
    expect(screen.queryByText("Piano - Iniciantes")).toBeNull();
  });
});
