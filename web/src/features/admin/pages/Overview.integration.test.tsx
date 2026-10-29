import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { adminService } from "../adminService";
import Overview from "./Overview";

vi.mock("../adminService", () => ({ adminService: {
  students: vi.fn(), teachers: vi.fn(), enrollments: vi.fn(), balance: vi.fn(),
} }));
const service = vi.mocked(adminService);
const piano = { id: "in-1", name: "Piano" };
const carlos = { id: "te-1", name: "Carlos Lima", username: "carlos", instruments: [piano] };
const ana = { id: "st-1", name: "Ana Souza", username: "ana" };
const bia = { id: "st-2", name: "Bia Lopes", username: "bia" };
const enrollment = (id: string, monthlyFee: number | null) => ({ id, student: ana, teacher: carlos, instrument: piano,
  classLabel: "Piano", status: "ACTIVE" as const, monthlyFee });

const renderOverview = () => render(<MemoryRouter><Overview /></MemoryRouter>);

describe("Overview page", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    service.students.mockResolvedValue([ana, bia]);
    service.teachers.mockResolvedValue([carlos, { id: "te-2", name: "Davi Reis", username: "davi", instruments: [] }]);
    service.enrollments.mockResolvedValue([enrollment("en-1", 150), enrollment("en-2", null)]);
    service.balance.mockResolvedValue({ balance: -20 });
  });

  it("sums the expected monthly revenue from active enrollments", async () => {
    renderOverview();
    expect(await screen.findByText(/150,00/)).toBeInTheDocument();
    expect(service.enrollments).toHaveBeenCalledWith("ACTIVE");
    expect(screen.getByText("Soma das 2 matrículas ativas")).toBeInTheDocument();
    expect(screen.getByText("1 com matrícula ativa")).toBeInTheDocument();
  });

  it("lists what still needs attention with a link to fix it", async () => {
    renderOverview();
    expect(await screen.findByText("matrícula ativa sem mensalidade")).toBeInTheDocument();
    expect(screen.getByText("aluno sem matrícula ativa")).toBeInTheDocument();
    expect(screen.getByText("Bia Lopes")).toBeInTheDocument();
    expect(screen.getByText("professor sem instrumento cadastrado")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Resolver" })).toHaveLength(3);
    expect(screen.getByRole("link", { name: "Nova matrícula" })).toHaveAttribute("href", "/admin/enrollments?novo");
  });

  it("says everything is in order when nothing is pending", async () => {
    service.students.mockResolvedValue([ana]);
    service.teachers.mockResolvedValue([carlos]);
    service.enrollments.mockResolvedValue([enrollment("en-1", 150)]);
    renderOverview();
    expect(await screen.findByText(/Tudo em dia/)).toBeInTheDocument();
  });

  it("shows a translated error when loading fails", async () => {
    service.students.mockRejectedValue(new TypeError("offline"));
    renderOverview();
    expect(await screen.findByRole("alert")).toHaveTextContent("Sem conexão com o servidor");
  });
});
