import { Tabs } from "expo-router";

export default function AlunoLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="dashboard" options={{ title: "Início" }} />
      <Tabs.Screen name="aulas" options={{ title: "Aulas" }} />
      <Tabs.Screen name="pratica" options={{ title: "Praticar" }} />
      <Tabs.Screen name="materiais" options={{ title: "Materiais" }} />
      <Tabs.Screen name="metas" options={{ title: "Metas" }} />
      <Tabs.Screen name="mais" options={{ title: "Mais" }} />
      <Tabs.Screen name="progresso" options={{ href: null }} />
      <Tabs.Screen name="aula/[id]" options={{ href: null }} />
    </Tabs>
  );
}
