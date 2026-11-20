import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ProtectedRoute } from "../ProtectedRoute";
import { authService } from "../authService";

const session = vi.hoisted(() => ({ user: { username: "lucca", authorities: ["ROLE_MANAGER"], termsAccepted: false as boolean | undefined },
  acceptTerms: vi.fn(), logout: vi.fn() }));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("../useAuth", () => ({ useAuth: () => ({ ...session, loading: false }) }));
vi.mock("../authService", () => ({ authService: { terms: vi.fn(), acceptTerms: vi.fn() } }));

const service = vi.mocked(authService);
const renderPage = () => render(<MemoryRouter><ProtectedRoute><p>Painel</p></ProtectedRoute></MemoryRouter>);

describe("terms gate", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    session.user.termsAccepted = false;
    service.terms.mockResolvedValue({ version: "2026-11-20", text: "## 1. Sobre o Sonetto\nTexto dos termos." });
    service.acceptTerms.mockResolvedValue(undefined);
  });

  it("asks for acceptance before showing the panel", async () => {
    renderPage();

    expect(await screen.findByRole("heading", { name: "Termos de uso" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "1. Sobre o Sonetto" })).toBeInTheDocument();
    expect(screen.queryByText("Painel")).toBeNull();
    expect(screen.getByRole("button", { name: "Continuar" })).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name: "Li e aceito os termos de uso e a política de privacidade" }));
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));

    await waitFor(() => expect(service.acceptTerms).toHaveBeenCalledWith("2026-11-20"));
    expect(session.acceptTerms).toHaveBeenCalledTimes(1);
  });

  it("shows the panel when the terms are already accepted", () => {
    session.user.termsAccepted = true;
    renderPage();

    expect(screen.getByText("Painel")).toBeInTheDocument();
    expect(service.terms).not.toHaveBeenCalled();
  });
});
