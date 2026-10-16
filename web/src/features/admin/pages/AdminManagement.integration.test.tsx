import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import Users from "./Users";
import Roles from "./Roles";
import Finance from "./Finance";
import Permissions from "./Permissions";
import Settings from "./Settings";
import { adminService } from "../adminService";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("../adminService", () => ({ adminService: {
  users: vi.fn(), roles: vi.fn(), permissions: vi.fn(), createRole: vi.fn(),
  transactions: vi.fn(), balance: vi.fn(), createTransaction: vi.fn(),
  settings: vi.fn(), upsertSetting: vi.fn(),
} }));
const service = vi.mocked(adminService);
const admin = { id: 1, name: "ADMIN", description: "Acesso completo", permissions: [] };
const student = { id: 2, name: "STUDENT", description: "Aluno da escola", permissions: [] };

describe("Admin management improvements", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    service.roles.mockResolvedValue([admin, student]);
    service.users.mockResolvedValue([
      { id: "1", username: "admin", email: "admin@example.com", displayName: "Gestor", active: true, roles: [admin] },
      { id: "2", username: "ana", email: "ana@example.com", displayName: "Ana Souza", active: true, roles: [student] },
    ]);
    service.permissions.mockResolvedValue([]);
    service.createRole.mockResolvedValue({ id: 3, name: "MONITOR", description: "Apoio pedagógico", permissions: [] });
    service.transactions.mockResolvedValue([{ id: "1", type: "INCOME", amount: 150.5, description: "Mensalidade",
      category: "Aulas", date: "2026-10-16" }]);
    service.balance.mockResolvedValue({ balance: 150.5 });
    service.settings.mockResolvedValue([{ id: "1", key: "school.name", value: "Harmonia", description: "Escola" }]);
  });

  it("combines user search by name, username or email with the role filter", async () => {
    render(<Users />);
    await screen.findByText("Ana Souza");
    for (const term of ["souza", "ana", "ana@example.com"]) {
      fireEvent.change(screen.getByLabelText("Buscar usuários"), { target: { value: term } });
      expect(screen.getByText("Ana Souza")).toBeInTheDocument();
      expect(screen.queryByText("Gestor")).toBeNull();
    }
    fireEvent.change(screen.getByLabelText("Filtrar por perfil"), { target: { value: "1" } });
    expect(screen.getByText("Nenhum usuário encontrado")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Buscar usuários"), { target: { value: "" } });
    expect(screen.getByText("Gestor")).toBeInTheDocument();
    expect(screen.queryByText("Ana Souza")).toBeNull();
  });

  it("creates a role with name and description and reloads the list", async () => {
    render(<Roles />);
    await screen.findByText("Acesso completo");
    fireEvent.change(screen.getByLabelText("Nome do perfil"), { target: { value: "MONITOR" } });
    fireEvent.change(screen.getByLabelText("Descrição"), { target: { value: "Apoio pedagógico" } });
    fireEvent.click(screen.getByRole("button", { name: "Criar perfil" }));
    await waitFor(() => expect(service.createRole).toHaveBeenCalledWith("MONITOR", "Apoio pedagógico"));
    await waitFor(() => expect(service.roles).toHaveBeenCalledTimes(2));
  });

  it("formats financial dates and submits category and chosen date", async () => {
    render(<Finance />);
    expect(await screen.findByText("16/10/2026")).toBeInTheDocument();
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    expect(screen.getByLabelText("Data")).toHaveValue(today);
    fireEvent.change(screen.getByLabelText("Valor"), { target: { value: "99.50" } });
    fireEvent.change(screen.getByLabelText("Descrição"), { target: { value: "Compra" } });
    fireEvent.change(screen.getByLabelText("Categoria"), { target: { value: "Materiais" } });
    fireEvent.change(screen.getByLabelText("Data"), { target: { value: "2026-10-15" } });
    fireEvent.change(screen.getByLabelText("Tipo"), { target: { value: "EXPENSE" } });
    fireEvent.click(screen.getByRole("button", { name: "Lançar" }));
    await waitFor(() => expect(service.createTransaction).toHaveBeenCalledWith({
      type: "EXPENSE", amount: 99.5, description: "Compra", category: "Materiais", date: "2026-10-15",
    }));
  });

  it("shows grouped permissions", async () => {
    service.permissions.mockResolvedValue([{ id: 1, name: "enrollment.manage", description: "Gerenciar matrículas" }]);
    render(<Permissions />);
    expect(await screen.findByText("enrollment.manage")).toBeInTheDocument();
    expect(screen.getByText("Gerenciar matrículas")).toBeInTheDocument();
  });

  it("keeps loaded setting values and saves the edited value", async () => {
    render(<Settings />);
    const input = await screen.findByLabelText("Valor de school.name");
    expect(input).toHaveValue("Harmonia");
    fireEvent.change(input, { target: { value: "Nova escola" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(service.upsertSetting).toHaveBeenCalledWith("school.name", "Nova escola", "Escola"));
  });

  it.each([
    { Page: Permissions, method: "permissions" as const },
    { Page: Settings, method: "settings" as const },
  ])("shows translated errors in $method", async ({ Page, method }) => {
    service[method].mockRejectedValue(new TypeError("offline"));
    render(<Page />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Sem conexão com o servidor");
  });
});
