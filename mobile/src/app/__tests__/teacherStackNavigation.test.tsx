import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { act, fireEvent, screen } from "@testing-library/react-native";
import { renderRouter } from "expo-router/testing-library";
import { router } from "expo-router";
import TeacherLayout from "@/app/(teacher)/_layout";
import TeacherTabsLayout from "@/app/(teacher)/(tabs)/_layout";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";
import { confirm } from "@/lib/confirm";

const mockUser = { authorities: ["ROLE_TEACHER"] };
jest.unmock("expo-router");
jest.mock("@/features/auth/useAuth", () => ({ useAuth: () => ({ user: mockUser }) }));
jest.mock("@/lib/confirm", () => ({ confirm: jest.fn() }));
jest.mock("@/lib/haptics", () => ({ haptics: { select: jest.fn() } }));

const confirmation = jest.mocked(confirm);

function ScheduleTab() {
  return <Pressable accessibilityRole="button" accessibilityLabel="Nova aula" onPress={() => router.push("/(teacher)/new-lesson")}><Text>Agenda do professor</Text></Pressable>;
}

function LessonDraft() {
  const [content, setContent] = useState("");
  useUnsavedChangesGuard(!!content);
  return <View><Text>Registro da aula</Text><TextInput accessibilityLabel="Rascunho" value={content} onChangeText={setContent} /></View>;
}

const routes = {
  "(teacher)/_layout": TeacherLayout,
  "(teacher)/(tabs)/_layout": TeacherTabsLayout,
  "(teacher)/(tabs)/dashboard": () => <Text>Início do professor</Text>,
  "(teacher)/(tabs)/students": () => <Text>Alunos do professor</Text>,
  "(teacher)/(tabs)/schedule": ScheduleTab,
  "(teacher)/(tabs)/reports": () => <Text>Relatórios do professor</Text>,
  "(teacher)/(tabs)/more": () => <Text>Mais do professor</Text>,
  "(teacher)/new-lesson": LessonDraft,
  "(teacher)/student-form": LessonDraft,
  "(teacher)/student/[id]": () => <Text>Detalhe do aluno</Text>,
  "(teacher)/practice/[id]": () => <Text>Detalhe da prática</Text>,
  "(teacher)/history": () => <Text>Histórico</Text>,
  "(teacher)/makeup/[id]": () => <Text>Reposição</Text>,
  "(teacher)/schedules": () => <Text>Horários fixos</Text>,
  "(teacher)/profile": () => <Text>Perfil</Text>,
  "(teacher)/classes": () => <Text>Turmas</Text>,
  "(teacher)/makeups": () => <Text>Reposições</Text>,
  "(teacher)/finance": () => <Text>Financeiro</Text>,
  "(teacher)/settings": () => <Text>Configurações</Text>,
  "(teacher)/help": () => <Text>Ajuda</Text>,
};

beforeEach(() => {
  jest.clearAllMocks();
  confirmation.mockResolvedValue(false);
});
afterEach(() => jest.useRealTimers());

it.each([
  ["/(teacher)/student/student-1", "Alunos"],
  ["/(teacher)/student-form", "Alunos"],
  ["/(teacher)/practice/practice-1", "Alunos"],
  ["/(teacher)/new-lesson", "Aulas"],
  ["/(teacher)/history", "Aulas"],
  ["/(teacher)/makeup/lesson-1", "Aulas"],
  ["/(teacher)/schedules", "Mais"],
  ["/(teacher)/profile", "Mais"],
  ["/(teacher)/classes", "Mais"],
  ["/(teacher)/makeups", "Mais"],
  ["/(teacher)/finance", "Mais"],
  ["/(teacher)/settings", "Mais"],
  ["/(teacher)/help", "Mais"],
])("shows one bar with the right active tab on %s", async (initialUrl, activeTab) => {
  await renderRouter(routes, { initialUrl });
  expect(screen.getAllByRole("tab")).toHaveLength(5);
  expect(screen.getByRole("tab", { name: activeTab, selected: true })).toBeVisible();
});

it("preserves Stack back history and avoids duplicate bars", async () => {
  await renderRouter(routes, { initialUrl: "/(teacher)/(tabs)/schedule" });
  await fireEvent.press(screen.getByRole("button", { name: "Nova aula" }));
  expect(screen.getByText("Registro da aula")).toBeVisible();
  await act(() => router.back());
  expect(screen.getByText("Agenda do professor")).toBeVisible();
  expect(screen.getAllByRole("tab")).toHaveLength(5);
});

it("guards tab dismissal and preserves the draft when declined", async () => {
  await renderRouter(routes, { initialUrl: "/(teacher)/(tabs)/schedule" });
  await fireEvent.press(screen.getByRole("button", { name: "Nova aula" }));
  await fireEvent.changeText(screen.getByLabelText("Rascunho"), "Escalas");
  await fireEvent.press(screen.getByRole("tab", { name: "Alunos" }));
  expect(confirmation).toHaveBeenCalledTimes(1);
  expect(screen.getByLabelText("Rascunho")).toHaveProp("value", "Escalas");
  confirmation.mockResolvedValue(true);
  await fireEvent.press(screen.getByRole("tab", { name: "Alunos" }));
  expect(screen.getByText("Alunos do professor")).toBeVisible();
  expect(screen.queryByLabelText("Rascunho")).toBeNull();
  expect(screen.getAllByRole("tab")).toHaveLength(5);
});

it("guards dismissing to the active parent tab from a direct form URL", async () => {
  await renderRouter(routes, { initialUrl: "/(teacher)/new-lesson" });
  await fireEvent.changeText(screen.getByLabelText("Rascunho"), "Arpejos");
  await fireEvent.press(screen.getByRole("tab", { name: "Aulas" }));
  expect(confirmation).toHaveBeenCalledTimes(1);
  expect(screen.getByLabelText("Rascunho")).toHaveProp("value", "Arpejos");
  confirmation.mockResolvedValue(true);
  await fireEvent.press(screen.getByRole("tab", { name: "Aulas" }));
  expect(screen.getByText("Agenda do professor")).toBeVisible();
  expect(screen.queryByLabelText("Rascunho")).toBeNull();
});
