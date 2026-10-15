import { Stack, useRouter, useSegments } from "expo-router";
import { StyleSheet, View } from "react-native";
import { AppTabBarView } from "@/components/app-tab-bar";
import { teacherTabs } from "@/components/teacher-tabs";
import { haptics } from "@/lib/haptics";
import { colors } from "@/ui/theme";

const activeTabs: Record<string, string> = {
  student: "students",
  "student-form": "students",
  practice: "students",
  "new-lesson": "schedule",
  lesson: "schedule",
  history: "schedule",
  makeup: "schedule",
  schedules: "more",
};

export default function TeacherLayout() {
  const router = useRouter();
  const segments = useSegments();
  const route = segments[segments.indexOf("(teacher)") + 1];
  const onSelect = (name: string) => {
    haptics.select();
    router.dismissTo(`/(teacher)/(tabs)/${name}`);
  };

  return (
    <View style={styles.screen}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.screen } }} />
      {!segments.includes("(tabs)") ? <AppTabBarView tabs={teacherTabs} activeName={activeTabs[route]} onSelect={onSelect} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screen },
});
