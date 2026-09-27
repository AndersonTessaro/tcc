import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function TeacherLayout() {
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: "#7040C5",
      tabBarInactiveTintColor: "#17131A",
      tabBarStyle: { backgroundColor: "#FFFFFF", borderTopColor: "#E7E7E7", height: 72, paddingTop: 7, paddingBottom: 6 },
      tabBarLabelStyle: { fontSize: 12 },
    }}>
      <Tabs.Screen name="dashboard" options={{ title: "Início", tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="students" options={{ title: "Alunos", tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="schedule" options={{ title: "Aulas", tabBarIcon: ({ color, size }) => <Ionicons name="musical-notes-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="reports" options={{ title: "Relatórios", tabBarIcon: ({ color, size }) => <Ionicons name="stats-chart-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="more" options={{ title: "Mais", tabBarIcon: ({ color, size }) => <Ionicons name="menu-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="new-lesson" options={{ href: null, title: "Nova aula" }} />
      <Tabs.Screen name="student/[id]" options={{ href: null }} />
      <Tabs.Screen name="schedules" options={{ href: null, title: "Horários" }} />
      <Tabs.Screen name="history" options={{ href: null, title: "Histórico" }} />
      <Tabs.Screen name="makeup/[lessonId]" options={{ href: null, title: "Reposição" }} />
    </Tabs>
  );
}
