import { Stack } from "expo-router";
import { colors } from "@/ui/theme";

export default function TeacherLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.screen } }} />;
}
