import type { ComponentProps } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useKeyboardVisible } from "@/hooks/use-keyboard-visible";

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>["tabBar"]>>[0];

const tabs = [
  { name: "dashboard", label: "Início", icon: require("@/assets/images/figma-student/home.png"), width: 25, height: 25 },
  { name: "lessons", label: "Aulas", icon: require("@/assets/images/figma-student/calendar.png"), width: 27, height: 27 },
  { name: "practice", label: "Prática", icon: require("@/assets/images/figma-student/musical-note.png"), width: 22, height: 22 },
  { name: "progress", label: "Progresso", icon: require("@/assets/images/figma-student/progress.png"), width: 23, height: 23 },
  { name: "more", label: "Mais", icon: require("@/assets/images/figma-student/options.png"), width: 25, height: 25 },
] as const;

export function StudentTabBar({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const keyboardVisible = useKeyboardVisible();
  const current = state.routes[state.index]?.name;
  const active = current === "lesson/[id]" ? "lessons"
    : current === "practice/register" ? "practice"
    : current === "goals" ? "progress" : current === "materials" ? "more" : current;

  if (keyboardVisible) return null;
  return (
    <View style={[styles.bar, { height: 91 + Math.max(0, insets.bottom - 22), paddingBottom: Math.max(0, insets.bottom - 22) }]}>
      {tabs.map((tab) => {
        const route = state.routes.find((entry) => entry.name === tab.name);
        if (!route) return null;
        return (
          <Pressable
            key={tab.name}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: active === tab.name }}
            onPress={() => navigation.navigate(route.name)}
            style={styles.item}
          >
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
  bar: {
    height: 91,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    paddingHorizontal: 5,
  },
  item: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  indicator: {
    position: "absolute",
    top: 0,
    width: "94.5%",
    height: 10,
    backgroundColor: "#6C45BE",
  },
  label: {
    color: "#000000",
    fontSize: 14,
    fontWeight: "300",
  },
});
