import "../global.css";
import { useEffect } from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { AuthProvider, useAuth } from "@/features/auth/useAuth";
import { isTeacher } from "@/features/auth/authService";
import { ToastProvider } from "@/ui/Toast";
import { colors } from "@/ui/theme";

function Guard() {
  const { user, restoring } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (restoring) return;
    const inAuth = segments[0] === "(auth)";
    if (!user && !inAuth) {
      router.replace("/(auth)/login");
    } else if (user && (inAuth || (isTeacher(user) && segments[0] === "(student)") || (!isTeacher(user) && segments[0] === "(teacher)"))) {
      router.replace(isTeacher(user) ? "/(teacher)/dashboard" : "/(student)/dashboard");
    }
  }, [user, restoring, segments, router]);

  if (restoring) return <View style={{ flex: 1, justifyContent: "center", backgroundColor: colors.screen }}><ActivityIndicator color={colors.primary} /></View>;
  return <Slot />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Guard />
      </ToastProvider>
    </AuthProvider>
  );
}
