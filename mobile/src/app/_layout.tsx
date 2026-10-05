import "../global.css";
import { useEffect } from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import { AuthProvider, useAuth } from "@/features/auth/useAuth";
import { isTeacher } from "@/features/auth/authService";
import { ActivityIndicator, View } from "react-native";

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

  if (restoring) return <View style={{ flex: 1, justifyContent: "center", backgroundColor: "#F4F4F4" }}><ActivityIndicator color="#572AA8" /></View>;
  return <Slot />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <Guard />
    </AuthProvider>
  );
}
