import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { act, fireEvent, screen } from "@testing-library/react-native";
import { renderRouter } from "expo-router/testing-library";
import { router } from "expo-router";
import StudentLayout from "@/app/(student)/_layout";
import StudentTabsLayout from "@/app/(student)/(tabs)/_layout";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";
import { confirm } from "@/lib/confirm";

const mockUser = { authorities: ["ROLE_STUDENT"] };
jest.unmock("expo-router");
jest.mock("@/features/auth/useAuth", () => ({ useAuth: () => ({ user: mockUser }) }));
jest.mock("@/lib/confirm", () => ({ confirm: jest.fn() }));
jest.mock("@/lib/haptics", () => ({ haptics: { select: jest.fn() } }));

const confirmation = confirm as jest.MockedFunction<typeof confirm>;

function PracticeTab() {
  return <Pressable accessibilityRole="button" accessibilityLabel="Abrir registro" onPress={() => router.push("/(student)/practice/register")}><Text>Prática em casa</Text></Pressable>;
}

function RegisterDraft() {
  const [notes, setNotes] = useState("");
  useUnsavedChangesGuard(!!notes);
  return <View><Text>Registrar prática</Text><TextInput accessibilityLabel="Rascunho" value={notes} onChangeText={setNotes} /></View>;
}

const routes = {
  "(student)/_layout": StudentLayout,
  "(student)/(tabs)/_layout": StudentTabsLayout,
  "(student)/(tabs)/dashboard": () => <Text>Início do aluno</Text>,
  "(student)/(tabs)/lessons": () => <Text>Aulas do aluno</Text>,
  "(student)/(tabs)/practice": PracticeTab,
  "(student)/(tabs)/progress": () => <Text>Progresso do aluno</Text>,
  "(student)/(tabs)/more": () => <Text>Mais do aluno</Text>,
  "(student)/practice/register": RegisterDraft,
  "(student)/teacher-notes": () => <Text>Observações do professor</Text>,
};

beforeEach(() => {
  jest.clearAllMocks();
  confirmation.mockResolvedValue(false);
});
afterEach(() => jest.useRealTimers());

it("keeps native Stack back history and renders only one tab bar", async () => {
  await renderRouter(routes, { initialUrl: "/(student)/(tabs)/practice" });
  await fireEvent.press(screen.getByRole("button", { name: "Abrir registro" }));
  expect(screen.getByText("Registrar prática")).toBeVisible();
  expect(screen.getAllByRole("tab")).toHaveLength(5);
  await act(() => router.back());
  expect(screen.getByText("Prática em casa")).toBeVisible();
  expect(screen.getAllByRole("tab")).toHaveLength(5);
});

it("keeps the dirty draft when tab navigation is declined and leaves after confirmation", async () => {
  await renderRouter(routes, { initialUrl: "/(student)/(tabs)/practice" });
  await fireEvent.press(screen.getByRole("button", { name: "Abrir registro" }));
  await fireEvent.changeText(screen.getByLabelText("Rascunho"), "Escalas");
  await fireEvent.press(screen.getByRole("tab", { name: "Aulas" }));
  expect(confirmation).toHaveBeenCalledTimes(1);
  expect(screen.getByLabelText("Rascunho")).toHaveProp("value", "Escalas");
  confirmation.mockResolvedValue(true);
  await fireEvent.press(screen.getByRole("tab", { name: "Aulas" }));
  expect(screen.getByText("Aulas do aluno")).toBeVisible();
  expect(screen.queryByLabelText("Rascunho")).toBeNull();
  expect(screen.getAllByRole("tab")).toHaveLength(5);
});

it("guards pressing the current parent tab and returns to the original tabs", async () => {
  await renderRouter(routes, { initialUrl: "/(student)/(tabs)/practice" });
  await fireEvent.press(screen.getByRole("button", { name: "Abrir registro" }));
  await fireEvent.changeText(screen.getByLabelText("Rascunho"), "Acordes");
  await fireEvent.press(screen.getByRole("tab", { name: "Prática" }));
  expect(confirmation).toHaveBeenCalledTimes(1);
  expect(screen.getByLabelText("Rascunho")).toHaveProp("value", "Acordes");
  confirmation.mockResolvedValue(true);
  await fireEvent.press(screen.getByRole("tab", { name: "Prática" }));
  expect(screen.getByText("Prática em casa")).toBeVisible();
  expect(screen.queryByLabelText("Rascunho")).toBeNull();
  expect(screen.getAllByRole("tab")).toHaveLength(5);
});

it("guards tab navigation when the form was opened directly", async () => {
  await renderRouter(routes, { initialUrl: "/(student)/practice/register" });
  await fireEvent.changeText(screen.getByLabelText("Rascunho"), "Arpejos");
  await fireEvent.press(screen.getByRole("tab", { name: "Início" }));
  expect(confirmation).toHaveBeenCalledTimes(1);
  expect(screen.getByLabelText("Rascunho")).toHaveProp("value", "Arpejos");
  confirmation.mockResolvedValue(true);
  await fireEvent.press(screen.getByRole("tab", { name: "Início" }));
  expect(screen.getByText("Início do aluno")).toBeVisible();
  expect(screen.queryByLabelText("Rascunho")).toBeNull();
});

it("keeps Mais active with one tab bar on teacher notes", async () => {
  await renderRouter(routes, { initialUrl: "/(student)/teacher-notes" });
  expect(screen.getByText("Observações do professor")).toBeVisible();
  expect(screen.getAllByRole("tab")).toHaveLength(5);
  expect(screen.getByRole("tab", { name: "Mais", selected: true })).toBeVisible();
});
