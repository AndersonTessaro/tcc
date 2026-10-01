import { Tabs } from "expo-router";
import { StudentTabBar } from "@/components/student-tab-bar";

export default function StudentLayout() {
  return (
    <Tabs tabBar={(props) => <StudentTabBar {...props} />} screenOptions={{ headerShown: false, tabBarHideOnKeyboard: true }}>
      <Tabs.Screen name="dashboard" options={{ title: "Início" }} />
      <Tabs.Screen name="lessons" options={{ title: "Aulas" }} />
      <Tabs.Screen name="practice" options={{ title: "Prática" }} />
      <Tabs.Screen name="practice/register" options={{ href: null }} />
      <Tabs.Screen name="progress" options={{ title: "Progresso" }} />
      <Tabs.Screen name="more" options={{ title: "Mais" }} />
      <Tabs.Screen name="materials" options={{ href: null }} />
      <Tabs.Screen name="goals" options={{ href: null }} />
      <Tabs.Screen name="lesson/[id]" options={{ href: null }} />
    </Tabs>
  );
}
