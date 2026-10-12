import { fireEvent, render, screen } from "@testing-library/react-native";
import type { ComponentProps } from "react";
import type { TextInput } from "react-native";
import Login from "@/app/(auth)/login";

const mockLogin = jest.fn();
const mockFocus = jest.fn();
jest.mock("@/ui/TextField", () => {
  const React: typeof import("react") = require("react");
  const actual: typeof import("@/ui/TextField") = jest.requireActual("@/ui/TextField");
  return {
    TextField: React.forwardRef<TextInput, ComponentProps<typeof actual.TextField>>((props, ref) => {
      React.useImperativeHandle(ref, () => ({ focus: () => mockFocus(props.accessibilityLabel) }) as TextInput);
      return <actual.TextField {...props} />;
    }),
  };
});
jest.mock("@/features/auth/useAuth", () => ({
  useAuth: () => ({ login: mockLogin, loading: false }),
}));

beforeEach(() => { mockLogin.mockReset(); mockFocus.mockReset(); });

describe("mobile test infra smoke test", () => {
  it("renders the login screen without error", async () => {
    await render(<Login />);

    expect(screen.getByText("Bem-vindo(a)!")).toBeVisible();
    expect(screen.getByPlaceholderText("seu@email.com")).toBeVisible();
    expect(screen.getByText("Não tem conta? Procure a secretaria da escola.")).toBeVisible();
  });

  it("blocks an empty submit with per-field errors", async () => {
    await render(<Login />);

    await fireEvent.press(screen.getByRole("button", { name: "Entrar" }));

    expect(screen.getByText("Informe seu e-mail ou usuário.")).toBeVisible();
    expect(screen.getByText("Informe sua senha.")).toBeVisible();
    expect(screen.getByLabelText("E-mail ou usuário")).toHaveProp("aria-invalid", true);
    expect(screen.getByLabelText("Senha")).toHaveProp("aria-invalid", true);
    expect(mockLogin).not.toHaveBeenCalled();
    expect(mockFocus).toHaveBeenLastCalledWith("E-mail ou usuário");
  });

  it("focuses the password when only it is missing and clears its error on edit", async () => {
    await render(<Login />);
    await fireEvent.changeText(screen.getByLabelText("E-mail ou usuário"), "aluno");
    await fireEvent.press(screen.getByRole("button", { name: "Entrar" }));

    expect(screen.queryByText("Informe seu e-mail ou usuário.")).toBeNull();
    expect(screen.getByText("Informe sua senha.")).toBeVisible();
    expect(mockFocus).toHaveBeenLastCalledWith("Senha");
    expect(mockLogin).not.toHaveBeenCalled();

    await fireEvent.changeText(screen.getByLabelText("Senha"), "segredo123");
    expect(screen.queryByText("Informe sua senha.")).toBeNull();
    expect(screen.getByLabelText("Senha")).toHaveProp("aria-invalid", false);
  });

  it("submits trimmed credentials from the password field and reports bad credentials", async () => {
    mockLogin.mockRejectedValueOnce(new Error("HTTP_401"));
    await render(<Login />);

    await fireEvent.changeText(screen.getByLabelText("E-mail ou usuário"), " aluno@escola.com ");
    await fireEvent.changeText(screen.getByLabelText("Senha"), "segredo123");
    await fireEvent(screen.getByLabelText("Senha"), "submitEditing");

    expect(mockLogin).toHaveBeenCalledWith("aluno@escola.com", "segredo123");
    expect(await screen.findByText("Login ou senha inválidos")).toBeVisible();
  });
});
