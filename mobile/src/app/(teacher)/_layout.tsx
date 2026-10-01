import { Tabs } from "expo-router";
import { TeacherTabBar } from "@/components/teacher-tab-bar";

export default function TeacherLayout() {
  return (
    <Tabs tabBar={(props) => <TeacherTabBar {...props} />} screenOptions={{ headerShown: false, tabBarHideOnKeyboard: true }}>
      <Tabs.Screen name="dashboard" options={{ title: "Início" }} />
      <Tabs.Screen name="students" options={{ title: "Alunos" }} />
      <Tabs.Screen name="schedule" options={{ title: "Aulas" }} />
      <Tabs.Screen name="reports" options={{ title: "Relatórios" }} />
      <Tabs.Screen name="more" options={{ title: "Mais" }} />
      <Tabs.Screen name="new-lesson" options={{ href: null, title: "Nova aula" }} />
      <Tabs.Screen name="student/[id]" options={{ href: null }} />
      <Tabs.Screen name="schedules" options={{ href: null, title: "Horários" }} />
      <Tabs.Screen name="history" options={{ href: null, title: "Histórico" }} />
      <Tabs.Screen name="makeup/[lessonId]" options={{ href: null, title: "Reposição" }} />
    </Tabs>
  );
}
