import { Stack, useRouter, useSegments } from "expo-router";
import { StyleSheet, View } from "react-native";
import { AppTabBarView } from "@/components/app-tab-bar";
import { studentTabs } from "@/components/student-tabs";
import { haptics } from "@/lib/haptics";
import { isTeacher } from "@/features/auth/authService";
import { useAuth } from "@/features/auth/useAuth";
import { colors } from "@/ui/theme";

const activeTabs: Record<string, string> = {
  lesson: "lessons",
  practice: "practice",
  goals: "progress",
  materials: "more",
  "teacher-notes": "more",
};

export default function StudentLayout() {
  const router = useRouter();
  const segments = useSegments();
  const route = segments[segments.indexOf("(student)") + 1];
  const { user } = useAuth();
  const onSelect = (name: string) => {
    haptics.select();
    router.dismissTo(`/(student)/(tabs)/${name}`);
  };

  // A URL é a mesma nos dois grupos (/dashboard): sem isto a tela do outro perfil monta e chama a API antes do Guard redirecionar.
  if (!user || isTeacher(user)) return null;

  return (
    <View style={styles.screen}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.screen } }} />
      {!segments.includes("(tabs)") ? <AppTabBarView tabs={studentTabs} activeName={activeTabs[route]} onSelect={onSelect} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screen },
});
