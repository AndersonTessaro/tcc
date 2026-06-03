import { Tabs } from "expo-router";

export default function StudentLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="dashboard" options={{ title: "Início" }} />
      <Tabs.Screen name="lessons" options={{ title: "Aulas" }} />
      <Tabs.Screen name="practice" options={{ title: "Praticar" }} />
      <Tabs.Screen name="materials" options={{ title: "Materiais" }} />
      <Tabs.Screen name="goals" options={{ title: "Metas" }} />
      <Tabs.Screen name="more" options={{ title: "Mais" }} />
      <Tabs.Screen name="progress" options={{ href: null }} />
      <Tabs.Screen name="lesson/[id]" options={{ href: null }} />
    </Tabs>
  );
}
