import { render, screen } from "@testing-library/react-native";
import Login from "@/app/(auth)/login";

jest.mock("@/features/auth/useAuth", () => ({
  useAuth: () => ({ login: jest.fn(), loading: false }),
}));

describe("mobile test infra smoke test", () => {
  it("renders the login screen without error", async () => {
    await render(<Login />);

    expect(screen.getByText("Bem-vindo(a)!")).toBeVisible();
    expect(screen.getByPlaceholderText("seu@email.com")).toBeVisible();
  });
});
