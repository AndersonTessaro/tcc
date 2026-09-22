import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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
  },
}));

const service = vi.mocked(adminService);

describe("Registrations page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    service.students.mockResolvedValue([{ id: "st-1", name: "Ana Souza", username: "ana" }]);
    service.teachers.mockResolvedValue([{ id: "te-1", name: "Carlos Lima", username: "carlos" }]);
    service.instruments.mockResolvedValue([{ id: "in-1", name: "Piano" }]);
    service.createEnrollment.mockResolvedValue({ id: "enr-1" });
    service.createInstrument.mockResolvedValue({ id: "in-2" });
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

  it("does not submit an incomplete enrollment", async () => {
    render(<Registrations />);
    await screen.findByRole("option", { name: "Piano" });

    fireEvent.click(screen.getByRole("button", { name: "Criar matrícula" }));

    expect(service.createEnrollment).not.toHaveBeenCalled();
  });

  it("reloads the options after creating an instrument", async () => {
    render(<Registrations />);
    await screen.findByRole("option", { name: "Piano" });

    fireEvent.change(screen.getByPlaceholderText("Nome do instrumento"), { target: { value: "Violino" } });
    fireEvent.click(screen.getByRole("button", { name: "Criar" }));

    await waitFor(() => expect(service.instruments).toHaveBeenCalledTimes(2));
  });
});
