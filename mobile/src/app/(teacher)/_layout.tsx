import { Tabs } from "expo-router";

export default function TeacherLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="dashboard" options={{ title: "Início" }} />
      <Tabs.Screen name="students" options={{ title: "Alunos" }} />
      <Tabs.Screen name="new-lesson" options={{ title: "Nova aula" }} />
      <Tabs.Screen name="schedule" options={{ title: "Agenda" }} />
      <Tabs.Screen name="reports" options={{ title: "Relatórios" }} />
      <Tabs.Screen name="more" options={{ title: "Mais" }} />
      <Tabs.Screen name="student/[id]" options={{ href: null }} />
    </Tabs>
  );
}
