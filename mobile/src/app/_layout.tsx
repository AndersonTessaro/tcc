import { useEffect } from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import Head from "expo-router/head";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { AuthProvider, useAuth } from "@/features/auth/useAuth";
import { isTeacher } from "@/features/auth/authService";
import { ToastProvider } from "@/ui/Toast";
import { colors, space } from "@/ui/theme";
import { apiErrorMessage } from "@/lib/http/errorMessage";
import { Button } from "@/ui/Button";
import { ScreenState } from "@/ui/ScreenState";

function Guard() {
  const { user, restoring, restoreError, retryRestore, logout } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const restoreMessage = apiErrorMessage(restoreError, "Não foi possível restaurar sua sessão.");

  useEffect(() => {
    if (restoring || restoreError) return;
    const group = segments[0];
    if (!user) {
      if (group !== "(auth)") router.replace("/(auth)/login");
      return;
    }
    const teacher = isTeacher(user);
    if (group !== (teacher ? "teacher" : "(student)")) {
      router.replace(teacher ? "/teacher/dashboard" : "/(student)/dashboard");
    }
  }, [user, restoring, restoreError, segments, router]);

  if (restoring) return <View style={styles.screen}><ActivityIndicator color={colors.primary} /></View>;
  if (restoreError) return (
    <View style={styles.screen}>
      <ScreenState title="Sem conexão com o servidor" message={restoreMessage === "Sem conexão com o servidor" ? undefined : restoreMessage}
        retry={() => void retryRestore()} />
      <Button label="Voltar ao login" variant="secondary" style={styles.login} onPress={async () => {
        await logout();
        router.replace("/(auth)/login");
      }} />
    </View>
  );
  return <Slot />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <Head><title>Sonetto</title></Head>
      <ToastProvider>
        <Guard />
      </ToastProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: "center", backgroundColor: colors.screen },
  login: { margin: space.lg },
});
