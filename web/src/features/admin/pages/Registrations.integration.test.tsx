import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import Teachers from "./Teachers";
import Students from "./Students";
import Instruments from "./Instruments";
import Enrollments from "./Enrollments";
import { adminService } from "../adminService";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("../adminService", () => ({
  adminService: {
    enrollments: vi.fn(),
    students: vi.fn(),
    teachers: vi.fn(),
    instruments: vi.fn(),
    createStudent: vi.fn(),
    createTeacher: vi.fn(),
    createInstrument: vi.fn(),
    createEnrollment: vi.fn(),
    setTeacherInstruments: vi.fn(),
  },
}));

const service = vi.mocked(adminService);
const piano = { id: "in-1", name: "Piano" };
const violin = { id: "in-2", name: "Violino" };

const openDialog = (button: string, title = button) => {
  fireEvent.click(screen.getAllByRole("button", { name: button })[0]);
  return within(screen.getByRole("dialog", { name: title }));
};

describe("Registration pages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    service.enrollments.mockResolvedValue([]);
    service.students.mockResolvedValue([{ id: "st-1", name: "Ana Souza", username: "ana" }]);
    service.teachers.mockResolvedValue([
      { id: "te-1", name: "Carlos Lima", username: "carlos", instruments: [piano] },
    ]);
    service.instruments.mockResolvedValue([piano, violin]);
    service.createEnrollment.mockResolvedValue({ id: "enr-1" });
    service.createInstrument.mockResolvedValue({ id: "in-3" });
    service.createTeacher.mockResolvedValue({ id: "te-2" });
    service.createStudent.mockResolvedValue({ id: "st-2" });
    service.setTeacherInstruments.mockResolvedValue({
      id: "te-1",
      name: "Carlos Lima",
      username: "carlos",
      instruments: [piano, violin],
    });
  });

  it("creates an enrollment from the selected names instead of typed ids", async () => {
    render(<Enrollments />);
    await screen.findByText("Nenhuma matrícula encontrada");
    const form = openDialog("Nova matrícula");
    await form.findByRole("option", { name: "Ana Souza (ana)" });

    fireEvent.change(form.getByLabelText("Aluno"), { target: { value: "st-1" } });
    fireEvent.change(form.getByLabelText("Professor"), { target: { value: "te-1" } });
    fireEvent.change(form.getByLabelText("Instrumento"), { target: { value: "in-1" } });
    fireEvent.click(form.getByRole("button", { name: "Criar matrícula" }));

    await waitFor(() =>
      expect(service.createEnrollment).toHaveBeenCalledWith({
        studentId: "st-1",
        teacherId: "te-1",
        instrumentId: "in-1",
        monthlyFee: null,
      }),
    );
  });

  it("only offers the instruments the selected teacher teaches", async () => {
    render(<Enrollments />);
    await screen.findByText("Nenhuma matrícula encontrada");
    const form = openDialog("Nova matrícula");
    await form.findByRole("option", { name: "Ana Souza (ana)" });
    const instrumentSelect = form.getByLabelText("Instrumento");

    expect(within(instrumentSelect).queryByRole("option", { name: "Piano" })).toBeNull();

    fireEvent.change(form.getByLabelText("Professor"), { target: { value: "te-1" } });

    expect(within(instrumentSelect).getByRole("option", { name: "Piano" })).toBeInTheDocument();
    expect(within(instrumentSelect).queryByRole("option", { name: "Violino" })).toBeNull();
  });

  it("does not submit an incomplete enrollment", async () => {
    render(<Enrollments />);
    await screen.findByText("Nenhuma matrícula encontrada");
    const form = openDialog("Nova matrícula");
    await form.findByRole("option", { name: "Ana Souza (ana)" });

    fireEvent.click(form.getByRole("button", { name: "Criar matrícula" }));

    expect(service.createEnrollment).not.toHaveBeenCalled();
  });

  it("creates a teacher with the instruments they teach", async () => {
    render(<Teachers />);
    await screen.findByText("Carlos Lima");
    const teacherForm = openDialog("Novo professor");

    fireEvent.change(teacherForm.getByLabelText("Usuário"), { target: { value: "bia" } });
    fireEvent.change(teacherForm.getByLabelText("E-mail"), { target: { value: "bia@example.com" } });
    fireEvent.change(teacherForm.getByLabelText("Senha"), { target: { value: "Password@123" } });
    fireEvent.change(teacherForm.getByLabelText("Nome"), { target: { value: "Bia" } });
    fireEvent.click(teacherForm.getByLabelText("Violino"));
    fireEvent.click(teacherForm.getByRole("button", { name: "Cadastrar professor" }));

    await waitFor(() =>
      expect(service.createTeacher).toHaveBeenCalledWith(
        expect.objectContaining({ username: "bia", instrumentIds: ["in-2"] }),
      ),
    );
  });

  it("updates the instruments of an existing teacher", async () => {
    render(<Teachers />);
    await screen.findByText("Carlos Lima");
    const editor = openDialog("Editar instrumentos de Carlos Lima", "Instrumentos de Carlos Lima");
    fireEvent.click(editor.getByLabelText("Violino"));
    fireEvent.click(editor.getByRole("button", { name: "Salvar instrumentos" }));

    await waitFor(() => expect(service.setTeacherInstruments).toHaveBeenCalledWith("te-1", ["in-1", "in-2"]));
    await waitFor(() => expect(service.teachers).toHaveBeenCalledTimes(2));
  });

  it("reloads the options after creating an instrument", async () => {
    render(<Instruments />);
    await screen.findByText("Piano");

    fireEvent.change(screen.getByPlaceholderText("Nome do instrumento"), { target: { value: "Flauta" } });
    fireEvent.click(screen.getByRole("button", { name: "Criar instrumento" }));

    await waitFor(() => expect(service.instruments).toHaveBeenCalledTimes(2));
  });

  it("lists and searches students and reloads after creation", async () => {
    render(<Students />);
    expect(await screen.findByText("Ana Souza")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Buscar alunos"), { target: { value: "missing" } });
    expect(screen.getByText("Nenhum aluno encontrado")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Buscar alunos"), { target: { value: "ana" } });
    expect(screen.getByText("Ana Souza")).toBeInTheDocument();
    const form = openDialog("Novo aluno");
    fireEvent.change(form.getByLabelText("Usuário"), { target: { value: "bia" } });
    fireEvent.change(form.getByLabelText("E-mail"), { target: { value: "bia@example.com" } });
    fireEvent.change(form.getByLabelText("Senha"), { target: { value: "Password@123" } });
    fireEvent.change(form.getByLabelText("Nome"), { target: { value: "Bia" } });
    fireEvent.click(form.getByRole("button", { name: "Cadastrar aluno" }));
    await waitFor(() => expect(service.createStudent).toHaveBeenCalledWith(expect.objectContaining({ username: "bia" })));
    await waitFor(() => expect(service.students).toHaveBeenCalledTimes(2));
  });

  it("shows translated load errors instead of an empty student list", async () => {
    service.students.mockRejectedValueOnce(new TypeError("offline"));
    render(<Students />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Sem conexão com o servidor");
    expect(screen.queryByText("Nenhum aluno encontrado")).toBeNull();
  });
});
