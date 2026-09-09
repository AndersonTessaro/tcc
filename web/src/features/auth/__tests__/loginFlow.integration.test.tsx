import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";

/**
 * Integration test: the whole web app wired together (router + AuthProvider +
 * apiClient + pages) with only the network boundary faked. The unit tests under
 * `lib/http` cover the client in isolation; this one covers the seam between layers.
 *
 * App is imported dynamically per test because `lib/http` captures `fetch` when the
 * module is first evaluated — the stub has to be installed first.
 */

const ADMIN_SESSION = {
  accessToken: "access-token-1",
  username: "admin",
  authorities: ["ROLE_ADMIN", "auth.user.manage"],
};

const USERS = [
  {
    id: "u-1",
    username: "admin",
    email: "admin@harmonia.local",
    displayName: "Administrador",
    active: true,
    roles: [{ id: 1, name: "ADMIN", description: "", permissions: [] }],
  },
];

const jsonResponse = (status: number, body: unknown) =>
  ({ status, ok: status < 400, json: () => Promise.resolve(body) }) as Response;

const routeFetch = (input: RequestInfo | URL): Promise<Response> => {
  const url = String(input);
  if (url.endsWith("/auth/login")) return Promise.resolve(jsonResponse(200, ADMIN_SESSION));
  if (url.endsWith("/auth/me"))
    return Promise.resolve(jsonResponse(200, { ...ADMIN_SESSION, displayName: "Administrador" }));
  if (url.endsWith("/admin/security/users")) return Promise.resolve(jsonResponse(200, USERS));
  if (url.endsWith("/admin/security/roles")) return Promise.resolve(jsonResponse(200, USERS[0].roles));
  return Promise.resolve(jsonResponse(404, {}));
};

const renderApp = async () => {
  const { default: App } = await import("@/App");
  return render(<App />);
};

describe("web admin login flow", () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
    window.history.pushState({}, "", "/");
    vi.stubGlobal("fetch", vi.fn(routeFetch));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("redirects an anonymous visitor to the login screen", async () => {
    await renderApp();

    expect(await screen.findByPlaceholderText("E-mail ou usuário")).toBeInTheDocument();
    expect(screen.getByText("Configurador administrativo")).toBeInTheDocument();
  });

  it("signs an admin in and lands on the user management page", async () => {
    await renderApp();

    fireEvent.change(await screen.findByPlaceholderText("E-mail ou usuário"), {
      target: { value: "admin" },
    });
    fireEvent.change(screen.getByPlaceholderText("Senha"), { target: { value: "Admin@123" } });
    fireEvent.submit(screen.getByRole("button", { name: "Entrar" }).closest("form")!);

    // "Usuários" shows up twice once logged in: sidebar link + page title.
    expect(await screen.findAllByText("Usuários")).not.toHaveLength(0);
    await waitFor(() => expect(screen.getByText("admin@harmonia.local")).toBeInTheDocument());
    expect(localStorage.getItem("harmonia_access")).toBe(ADMIN_SESSION.accessToken);
  });
});
