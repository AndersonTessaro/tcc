import type { ComponentProps } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Tabs } from "expo-router";

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>["tabBar"]>>[0];

const tabs = [
  { name: "dashboard", label: "Início", icon: require("@/assets/images/figma-teacher/home.png"), width: 25, height: 25 },
  { name: "students", label: "Alunos", icon: require("@/assets/images/figma-teacher/students.png"), width: 27, height: 27 },
  { name: "schedule", label: "Aulas", icon: require("@/assets/images/figma-teacher/lessons.png"), width: 22, height: 22 },
  { name: "reports", label: "Relatórios", icon: require("@/assets/images/figma-teacher/reports.png"), width: 23, height: 23 },
  { name: "more", label: "Mais", icon: require("@/assets/images/figma-teacher/more.png"), width: 25, height: 25 },
] as const;

export function TeacherTabBar({ state, navigation }: TabBarProps) {
  const current = state.routes[state.index]?.name;
  const active = current === "student/[id]" || current === "new-lesson" ? "students"
    : current === "history" || current === "makeup/[lessonId]" ? "schedule"
    : current === "schedules" ? "more" : current;

  return (
    <View style={styles.bar}>
      {tabs.map((tab) => {
        const route = state.routes.find((entry) => entry.name === tab.name);
        if (!route) return null;
        return (
          <Pressable key={tab.name} accessibilityRole="tab" accessibilityLabel={tab.label} accessibilityState={{ selected: active === tab.name }} onPress={() => navigation.navigate(route.name)} style={styles.item}>
            {active === tab.name ? <View style={styles.indicator} /> : null}
            <Image source={tab.icon} style={{ width: tab.width, height: tab.height }} />
            <Text style={styles.label}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { height: 91, backgroundColor: "#FFFFFF", flexDirection: "row", paddingHorizontal: 5 },
  item: { flex: 1, alignItems: "center", justifyContent: "center", gap: 5 },
  indicator: { position: "absolute", top: 0, width: 76, height: 10, backgroundColor: "#6C45BE" },
  label: { color: "#000000", fontSize: 14, fontWeight: "300" },
});
