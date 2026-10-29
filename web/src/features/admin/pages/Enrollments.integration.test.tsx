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

const openEditor = () => {
  fireEvent.click(screen.getByRole("button", { name: "Editar matrícula de Ana Souza" }));
  return within(screen.getByRole("dialog", { name: "Matrícula de Ana Souza" }));
};
const filterBy = (label: string) =>
  fireEvent.click(within(screen.getByRole("group", { name: "Filtrar por status" })).getByRole("button", { name: label }));

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
    filterBy("Suspensas");
    await waitFor(() => expect(service.enrollments).toHaveBeenLastCalledWith("SUSPENDED"));
    filterBy("Todas");
    await waitFor(() => expect(service.enrollments).toHaveBeenLastCalledWith(undefined));
  });

  it("offers to define the fee when an enrollment has none", async () => {
    service.enrollments.mockResolvedValue([{ ...enrollment, monthlyFee: null }]);
    render(<Enrollments />);
    fireEvent.click(await screen.findByRole("button", { name: "Definir mensalidade de Ana Souza" }));
    expect(screen.getByRole("dialog", { name: "Matrícula de Ana Souza" })).toBeInTheDocument();
  });

  it("confirms closure before saving a status change", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<Enrollments />);
    await screen.findByText("Piano - Iniciantes");
    const editor = openEditor();
    fireEvent.change(editor.getByLabelText("Status"), { target: { value: "CLOSED" } });
    fireEvent.click(editor.getByRole("button", { name: "Salvar alterações" }));
    expect(confirm).toHaveBeenCalled();
    expect(service.setEnrollmentStatus).not.toHaveBeenCalled();
    confirm.mockReturnValue(true);
    fireEvent.click(editor.getByRole("button", { name: "Salvar alterações" }));
    await waitFor(() => expect(service.setEnrollmentStatus).toHaveBeenCalledWith("en-1", "CLOSED"));
    expect(service.setEnrollmentFee).not.toHaveBeenCalled();
    await waitFor(() => expect(service.enrollments).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole("dialog")).toBeNull();
    confirm.mockRestore();
  });

  it("edits the fee including clearing and zero", async () => {
    render(<Enrollments />);
    await screen.findByText("Piano - Iniciantes");
    for (const [input, expected] of [["200.75", 200.75], ["", null], ["0", 0]] as const) {
      const editor = openEditor();
      fireEvent.change(editor.getByLabelText("Mensalidade (R$)"), { target: { value: input } });
      fireEvent.click(editor.getByRole("button", { name: "Salvar alterações" }));
      await waitFor(() => expect(service.setEnrollmentFee).toHaveBeenLastCalledWith("en-1", expected));
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    }
    expect(service.setEnrollmentStatus).not.toHaveBeenCalled();
  });

  it("creates with fee and resets an incompatible instrument when teacher changes", async () => {
    render(<Enrollments />);
    await screen.findByText("Piano - Iniciantes");
    fireEvent.click(screen.getByRole("button", { name: "Nova matrícula" }));
    const form = within(screen.getByRole("dialog", { name: "Nova matrícula" }));
    await form.findByRole("option", { name: "Ana Souza (ana)" });
    fireEvent.change(form.getByLabelText("Aluno"), { target: { value: "st-1" } });
    fireEvent.change(form.getByLabelText("Professor"), { target: { value: "te-1" } });
    fireEvent.change(form.getByLabelText("Instrumento"), { target: { value: "in-1" } });
    fireEvent.change(form.getByLabelText("Professor"), { target: { value: "te-2" } });
    expect(within(form.getByLabelText("Instrumento")).queryByRole("option", { name: "Piano" })).toBeNull();
    expect(form.getByLabelText("Instrumento")).toHaveValue("");
    fireEvent.change(form.getByLabelText("Professor"), { target: { value: "te-1" } });
    fireEvent.change(form.getByLabelText("Instrumento"), { target: { value: "in-1" } });
    fireEvent.change(form.getByLabelText("Mensalidade (opcional)"), { target: { value: "120.50" } });
    fireEvent.click(form.getByRole("button", { name: "Criar matrícula" }));
    await waitFor(() => expect(service.createEnrollment).toHaveBeenCalledWith({
      studentId: "st-1", teacherId: "te-1", instrumentId: "in-1", monthlyFee: 120.5,
    }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("rejects incomplete creation and shows translated mutation errors", async () => {
    service.setEnrollmentStatus.mockRejectedValue(new ApiError(409, "DUPLICATE_RESOURCE", "Duplicate"));
    render(<Enrollments />);
    await screen.findByText("Piano - Iniciantes");
    fireEvent.click(screen.getByRole("button", { name: "Nova matrícula" }));
    const form = within(screen.getByRole("dialog", { name: "Nova matrícula" }));
    fireEvent.click(await form.findByRole("button", { name: "Criar matrícula" }));
    expect(service.createEnrollment).not.toHaveBeenCalled();
    fireEvent.click(form.getByRole("button", { name: "Fechar painel" }));
    const editor = openEditor();
    fireEvent.change(editor.getByLabelText("Status"), { target: { value: "SUSPENDED" } });
    fireEvent.click(editor.getByRole("button", { name: "Salvar alterações" }));
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
    const editor = openEditor();
    fireEvent.change(editor.getByLabelText("Status"), { target: { value: "SUSPENDED" } });
    fireEvent.click(editor.getByRole("button", { name: "Salvar alterações" }));
    filterBy("Encerradas");
    await screen.findByText("Nenhuma matrícula encontrada");
    await act(async () => { finish(); });
    await waitFor(() => expect(service.enrollments).toHaveBeenCalledTimes(3));
    expect(service.enrollments).toHaveBeenLastCalledWith("CLOSED");
    expect(screen.queryByText("Piano - Iniciantes")).toBeNull();
  });
});
