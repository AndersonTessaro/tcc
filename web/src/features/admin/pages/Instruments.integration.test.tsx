import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { ApiError } from "@/lib/http/apiError";
import { adminService } from "../adminService";
import Instruments from "./Instruments";

const auth = vi.hoisted(() => ({ authorities: ["ROLE_ADMIN"] }));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/features/auth/useAuth", () => ({ useAuth: () => ({ user: auth }) }));
vi.mock("../adminService", () => ({ adminService: {
  instruments: vi.fn(), teachers: vi.fn(), createInstrument: vi.fn(), deleteInstrument: vi.fn(),
} }));

const service = vi.mocked(adminService);
const piano = { id: "instrument-1", name: "Piano" };

describe("Instrument deletion", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    auth.authorities = ["ROLE_ADMIN"];
    service.instruments.mockResolvedValue([piano]);
    service.teachers.mockResolvedValue([]);
    service.deleteInstrument.mockResolvedValue(undefined);
  });

  afterEach(() => vi.restoreAllMocks());

  it.each(["ROLE_MANAGER", "ROLE_TEACHER"])("hides deletion for %s", async (role) => {
    auth.authorities = [role];
    render(<Instruments />);

    await screen.findByText("Piano");

    expect(screen.queryByRole("button", { name: "Excluir instrumento Piano" })).toBeNull();
  });

  it("confirms deletion and reloads instruments and teachers after success", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    service.instruments.mockResolvedValueOnce([piano]).mockResolvedValueOnce([]);
    render(<Instruments />);

    fireEvent.click(await screen.findByRole("button", { name: "Excluir instrumento Piano" }));

    expect(confirm).toHaveBeenCalledWith("Excluir o instrumento Piano?");
    await waitFor(() => expect(service.deleteInstrument).toHaveBeenCalledExactlyOnceWith(piano.id));
    await screen.findByText("Nenhum instrumento encontrado");
    expect(toast.success).toHaveBeenCalledWith("Instrumento excluído.");
    expect(service.instruments).toHaveBeenCalledTimes(2);
    expect(service.teachers).toHaveBeenCalledTimes(2);
    expect(screen.queryByText("Piano")).toBeNull();
  });

  it("keeps the instrument when confirmation is canceled", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<Instruments />);

    fireEvent.click(await screen.findByRole("button", { name: "Excluir instrumento Piano" }));

    expect(service.deleteInstrument).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
    expect(screen.getByText("Piano")).toBeInTheDocument();
    expect(service.instruments).toHaveBeenCalledTimes(1);
  });

  it("translates RESOURCE_IN_USE and keeps the instrument after a conflict", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    service.deleteInstrument.mockRejectedValueOnce(new ApiError(409, "RESOURCE_IN_USE", "Instrument is in use"));
    render(<Instruments />);

    fireEvent.click(await screen.findByRole("button", { name: "Excluir instrumento Piano" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(
      "Este instrumento está em uso (matrícula, turma ou prática) e não pode ser excluído.",
    ));
    expect(toast.success).not.toHaveBeenCalled();
    expect(screen.getByText("Piano")).toBeInTheDocument();
    expect(service.instruments).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByRole("button", { name: "Excluir instrumento Piano" })).toBeEnabled());
  });
});
