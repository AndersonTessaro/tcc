import { fireEvent, render, screen } from "@testing-library/react-native";
import Login from "@/app/(auth)/login";

const mockLogin = jest.fn();
jest.mock("@/features/auth/useAuth", () => ({
  useAuth: () => ({ login: mockLogin, loading: false }),
}));

beforeEach(() => mockLogin.mockReset());

describe("mobile test infra smoke test", () => {
  it("renders the login screen without error", async () => {
    await render(<Login />);

    expect(screen.getByText("Bem-vindo(a)!")).toBeVisible();
    expect(screen.getByPlaceholderText("seu@email.com")).toBeVisible();
    expect(screen.getByText("Não tem conta? Procure a secretaria da escola.")).toBeVisible();
  });

  it("blocks an empty submit with an inline message", async () => {
    await render(<Login />);

    await fireEvent.press(screen.getByRole("button", { name: "Entrar" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Informe seu e-mail ou usuário e a senha.");
    expect(mockLogin).not.toHaveBeenCalled();
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
