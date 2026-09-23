import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/ui/theme";

type IconName = keyof typeof Ionicons.glyphMap;

const tabIcons: Record<string, IconName> = {
  dashboard: "home-outline",
  lessons: "calendar-outline",
  practice: "musical-notes-outline",
  progress: "stats-chart-outline",
  more: "menu-outline",
};

export default function StudentLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.text,
        tabBarHideOnKeyboard: true,
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={tabIcons[route.name] ?? "ellipse-outline"} size={size} color={color} />
        ),
        tabBarLabelStyle: { fontSize: 12 },
        tabBarStyle: { backgroundColor: colors.surface, borderTopWidth: 0 },
      })}
    >
      <Tabs.Screen name="dashboard" options={{ title: "Início" }} />
      <Tabs.Screen name="lessons" options={{ title: "Aulas" }} />
      <Tabs.Screen name="practice" options={{ title: "Prática" }} />
      <Tabs.Screen name="progress" options={{ title: "Progresso" }} />
      <Tabs.Screen name="more" options={{ title: "Mais" }} />
      <Tabs.Screen name="materials" options={{ href: null }} />
      <Tabs.Screen name="goals" options={{ href: null }} />
      <Tabs.Screen name="lesson/[id]" options={{ href: null }} />
    </Tabs>
  );
}
