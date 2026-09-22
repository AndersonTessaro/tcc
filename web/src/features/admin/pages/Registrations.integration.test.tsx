import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import Registrations from "./Registrations";
import { adminService } from "../adminService";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("../adminService", () => ({
  adminService: {
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

describe("Registrations page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    service.students.mockResolvedValue([{ id: "st-1", name: "Ana Souza", username: "ana" }]);
    service.teachers.mockResolvedValue([
      { id: "te-1", name: "Carlos Lima", username: "carlos", instruments: [piano] },
    ]);
    service.instruments.mockResolvedValue([piano, violin]);
    service.createEnrollment.mockResolvedValue({ id: "enr-1" });
    service.createInstrument.mockResolvedValue({ id: "in-3" });
    service.createTeacher.mockResolvedValue({ id: "te-2" });
    service.setTeacherInstruments.mockResolvedValue({
      id: "te-1",
      name: "Carlos Lima",
      username: "carlos",
      instruments: [piano, violin],
    });
  });

  it("creates an enrollment from the selected names instead of typed ids", async () => {
    render(<Registrations />);
    await screen.findByRole("option", { name: "Ana Souza (ana)" });

    fireEvent.change(screen.getByLabelText("Aluno"), { target: { value: "st-1" } });
    fireEvent.change(screen.getByLabelText("Professor"), { target: { value: "te-1" } });
    fireEvent.change(screen.getByLabelText("Instrumento"), { target: { value: "in-1" } });
    fireEvent.click(screen.getByRole("button", { name: "Criar matrícula" }));

    await waitFor(() =>
      expect(service.createEnrollment).toHaveBeenCalledWith({
        studentId: "st-1",
        teacherId: "te-1",
        instrumentId: "in-1",
      }),
    );
  });

  it("only offers the instruments the selected teacher teaches", async () => {
    render(<Registrations />);
    await screen.findByRole("option", { name: "Ana Souza (ana)" });
    const instrumentSelect = screen.getByLabelText("Instrumento");

    expect(within(instrumentSelect).queryByRole("option", { name: "Piano" })).toBeNull();

    fireEvent.change(screen.getByLabelText("Professor"), { target: { value: "te-1" } });

    expect(within(instrumentSelect).getByRole("option", { name: "Piano" })).toBeInTheDocument();
    expect(within(instrumentSelect).queryByRole("option", { name: "Violino" })).toBeNull();
  });

  it("does not submit an incomplete enrollment", async () => {
    render(<Registrations />);
    await screen.findByRole("option", { name: "Ana Souza (ana)" });

    fireEvent.click(screen.getByRole("button", { name: "Criar matrícula" }));

    expect(service.createEnrollment).not.toHaveBeenCalled();
  });

  it("creates a teacher with the instruments they teach", async () => {
    render(<Registrations />);
    await screen.findByRole("option", { name: "Ana Souza (ana)" });
    const teacherCard = screen.getByText("Novo professor").closest("div") as HTMLElement;

    fireEvent.change(within(teacherCard).getByPlaceholderText("Usuário"), { target: { value: "bia" } });
    fireEvent.click(within(teacherCard).getByLabelText("Violino"));
    fireEvent.click(within(teacherCard).getByRole("button", { name: "Criar professor" }));

    await waitFor(() =>
      expect(service.createTeacher).toHaveBeenCalledWith(
        expect.objectContaining({ username: "bia", instrumentIds: ["in-2"] }),
      ),
    );
  });

  it("updates the instruments of an existing teacher", async () => {
    render(<Registrations />);
    await screen.findByRole("option", { name: "Ana Souza (ana)" });

    fireEvent.change(screen.getByLabelText("Professor do vínculo"), { target: { value: "te-1" } });
    const linkCard = screen.getByText("Instrumentos do professor").closest("div") as HTMLElement;
    fireEvent.click(within(linkCard).getByLabelText("Violino"));
    fireEvent.click(within(linkCard).getByRole("button", { name: "Salvar instrumentos" }));

    await waitFor(() => expect(service.setTeacherInstruments).toHaveBeenCalledWith("te-1", ["in-1", "in-2"]));
    await waitFor(() => expect(service.teachers).toHaveBeenCalledTimes(2));
  });

  it("reloads the options after creating an instrument", async () => {
    render(<Registrations />);
    await screen.findByRole("option", { name: "Ana Souza (ana)" });

    fireEvent.change(screen.getByPlaceholderText("Nome do instrumento"), { target: { value: "Flauta" } });
    fireEvent.click(screen.getByRole("button", { name: "Criar" }));

    await waitFor(() => expect(service.instruments).toHaveBeenCalledTimes(2));
  });
});
