import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { GoalForm } from "../GoalForm";
import { confirm } from "@/lib/confirm";
import { ApiError } from "@/lib/http/apiError";

jest.mock("@/lib/confirm", () => ({ confirm: jest.fn() }));
const submit = jest.fn();
const saved = jest.fn();
const close = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  submit.mockResolvedValue({});
  jest.mocked(confirm).mockResolvedValue(true);
});

async function open() {
  await render(<GoalForm onSubmit={submit} onSaved={saved} onClose={close} />);
}

it("follows target, frequency and type choices until the title is edited", async () => {
  await open();
  expect(screen.getByLabelText("Título (opcional)")).toHaveProp("value", "3 h de prática por semana");
  await fireEvent.press(screen.getByRole("radio", { name: "2 h" }));
  expect(screen.getByLabelText("Título (opcional)")).toHaveProp("value", "2 h de prática por semana");
  await fireEvent.press(screen.getByRole("radio", { name: "Dias de prática" }));
  expect(screen.getByLabelText("Título (opcional)")).toHaveProp("value", "5 dias de prática por semana");
  await fireEvent.press(screen.getByRole("radio", { name: "Diária" }));
  expect(screen.getByLabelText("Título (opcional)")).toHaveProp("value", "1 dia de prática por dia");
  expect(screen.getByRole("button", { name: "Aumentar" })).toBeDisabled();
  await fireEvent.changeText(screen.getByLabelText("Título (opcional)"), "Meu objetivo");
  await fireEvent.press(screen.getByRole("radio", { name: "Presença nas aulas" }));
  await fireEvent.press(screen.getByRole("radio", { name: "Mensal" }));
  await fireEvent.press(screen.getByRole("button", { name: "Aumentar" }));
  expect(screen.getByLabelText("Título (opcional)")).toHaveProp("value", "Meu objetivo");
  await fireEvent.press(screen.getByRole("button", { name: "Salvar meta" }));
  expect(submit).toHaveBeenCalledWith({ title: "Meu objetivo", type: "ATTENDANCE", period: "MONTHLY", target: 2, description: undefined });
  expect(saved).toHaveBeenCalledTimes(1);
});

it("uses the suggested title when the optional title is blank", async () => {
  await open();
  await fireEvent.changeText(screen.getByLabelText("Título (opcional)"), "  ");
  await fireEvent.changeText(screen.getByLabelText("Descrição (opcional)"), " Escalas ");
  await fireEvent.press(screen.getByRole("button", { name: "Salvar meta" }));
  expect(submit).toHaveBeenCalledWith({ title: "3 h de prática por semana", type: "PRACTICE_TIME", period: "WEEKLY", target: 180, description: "Escalas" });
});

it.each([
  ["Diária", ["15 min", "30 min", "1 h"]],
  ["Semanal", ["1 h", "2 h", "3 h", "5 h"]],
  ["Mensal", ["5 h", "10 h", "20 h"]],
])("offers duration shortcuts for %s", async (frequency, labels) => {
  await open();
  await fireEvent.press(screen.getByRole("radio", { name: frequency as string }));
  for (const label of labels as string[]) expect(screen.getByRole("radio", { name: label })).toBeVisible();
});

it("rejects zero and invalid duration", async () => {
  await open();
  await fireEvent.changeText(screen.getByLabelText("Horas"), "0");
  await fireEvent.press(screen.getByRole("button", { name: "Salvar meta" }));
  expect(submit).not.toHaveBeenCalled();
  expect(screen.getByText("Informe um objetivo maior que zero.")).toBeVisible();
  await fireEvent.changeText(screen.getByLabelText("Minutos"), "60");
  await fireEvent.press(screen.getByRole("button", { name: "Salvar meta" }));
  expect(submit).not.toHaveBeenCalled();
});

it("caps practice days by period and keeps the minimum at one", async () => {
  await open();
  await fireEvent.press(screen.getByRole("radio", { name: "Dias de prática" }));
  for (let index = 0; index < 4; index++) await fireEvent.press(screen.getByRole("button", { name: "Aumentar" }));
  expect(screen.getByLabelText(/^Objetivo em dias:/)).toHaveTextContent("7");
  expect(screen.getByRole("button", { name: "Aumentar" })).toBeDisabled();
  await fireEvent.press(screen.getByRole("radio", { name: "Mensal" }));
  for (let index = 0; index < 25; index++) await fireEvent.press(screen.getByRole("button", { name: "Aumentar" }));
  expect(screen.getByLabelText(/^Objetivo em dias:/)).toHaveTextContent("31");
  await fireEvent.press(screen.getByRole("radio", { name: "Diária" }));
  expect(screen.getByLabelText(/^Objetivo em dias:/)).toHaveTextContent("1");
  expect(screen.getByRole("button", { name: "Diminuir" })).toBeDisabled();
});

it("locks keyboard saves and closing while the request is pending", async () => {
  let resolve!: () => void;
  submit.mockImplementationOnce(() => new Promise<void>((done) => { resolve = done; }));
  await open();
  const input = screen.getByLabelText("Título (opcional)");
  await act(() => { void input.props.onSubmitEditing(); void input.props.onSubmitEditing(); });
  expect(submit).toHaveBeenCalledTimes(1);
  await fireEvent.press(screen.getByRole("button", { name: "Fechar", includeHiddenElements: true }));
  expect(close).not.toHaveBeenCalled();
  expect(confirm).not.toHaveBeenCalled();
  await act(() => resolve());
  expect(saved).toHaveBeenCalledTimes(1);
});

it.each(["Cancelar", "Fechar"])("confirms dirty drafts through %s", async (label) => {
  jest.mocked(confirm).mockResolvedValueOnce(false).mockResolvedValueOnce(true);
  await open();
  await fireEvent.changeText(screen.getByLabelText("Título (opcional)"), "Rascunho");
  await fireEvent.press(screen.getByRole("button", { name: label, includeHiddenElements: true }));
  expect(close).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole("button", { name: label, includeHiddenElements: true }));
  expect(close).toHaveBeenCalledTimes(1);
});

it("translates request failures and allows retry", async () => {
  submit.mockRejectedValueOnce(new ApiError(403, "OWNERSHIP_DENIED"));
  await open();
  await fireEvent.press(screen.getByRole("button", { name: "Salvar meta" }));
  expect(screen.getByText("Sem permissão para acessar este registro")).toBeVisible();
  expect(saved).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole("button", { name: "Salvar meta" }));
  expect(saved).toHaveBeenCalledTimes(1);
});
