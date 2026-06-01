import { Tabs } from "expo-router";

export default function ProfessorLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="dashboard" options={{ title: "Início" }} />
      <Tabs.Screen name="alunos" options={{ title: "Alunos" }} />
      <Tabs.Screen name="nova-aula" options={{ title: "Nova aula" }} />
      <Tabs.Screen name="agenda" options={{ title: "Agenda" }} />
      <Tabs.Screen name="relatorios" options={{ title: "Relatórios" }} />
      <Tabs.Screen name="mais" options={{ title: "Mais" }} />
      <Tabs.Screen name="aluno/[id]" options={{ href: null }} />
    </Tabs>
  );
}
