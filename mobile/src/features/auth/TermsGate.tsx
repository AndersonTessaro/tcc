import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/ui/Button";
import { ScreenState } from "@/ui/ScreenState";
import { useToast } from "@/ui/Toast";
import { colors, radius, space, type } from "@/ui/theme";
import { apiErrorMessage } from "@/lib/http/errorMessage";
import { authService, type Terms } from "./authService";
import { useAuth } from "./useAuth";

const AGREEMENT = "Li e aceito os termos de uso e a política de privacidade";

export function TermsGate() {
  const { updateProfile, logout } = useAuth();
  const toast = useToast();
  const [terms, setTerms] = useState<Terms | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [agreed, setAgreed] = useState(false);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      setTerms(await authService.terms());
    } catch (error) {
      setLoadError(error);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const accept = async () => {
    if (!terms) return;
    try {
      await authService.acceptTerms(terms.version);
      updateProfile({ termsAccepted: true });
    } catch (error) {
      toast.show(apiErrorMessage(error, "Não foi possível registrar o aceite."), "error");
    }
  };

  if (loadError) return (
    <SafeAreaView style={styles.screen}>
      <ScreenState title="Não foi possível carregar os termos" message={apiErrorMessage(loadError, "Tente novamente.")}
        retry={() => void load()} />
    </SafeAreaView>
  );
  if (!terms) return <View style={[styles.screen, styles.center]}><ActivityIndicator color={colors.primary} /></View>;

  return (
    <SafeAreaView style={styles.screen}>
      <Text accessibilityRole="header" style={styles.title}>Termos de uso</Text>
      <Text style={styles.subtitle}>Para continuar usando o Sonetto, leia e aceite os termos abaixo.</Text>
      <ScrollView style={styles.card} contentContainerStyle={styles.cardContent}>
        {terms.text.split("\n").filter((line) => line.trim()).map((line, index) => line.startsWith("## ")
          ? <Text key={index} accessibilityRole="header" style={styles.heading}>{line.slice(3)}</Text>
          : <Text key={index} style={styles.paragraph}>{line}</Text>)}
      </ScrollView>
      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: agreed }} accessibilityLabel={AGREEMENT}
        onPress={() => setAgreed((value) => !value)} style={styles.agreement} hitSlop={8}>
        <Ionicons name={agreed ? "checkbox" : "square-outline"} size={24} color={colors.primary} />
        <Text style={styles.agreementText}>{AGREEMENT}</Text>
      </Pressable>
      <Button label="Continuar" onPress={accept} disabled={!agreed} />
      <Button label="Sair" variant="ghost" onPress={logout} style={styles.logout} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screen, padding: space.lg },
  center: { justifyContent: "center" },
  title: { ...type.display, marginTop: space.lg },
  subtitle: { ...type.body, color: colors.muted, marginTop: space.xs, marginBottom: space.md },
  card: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.cardBorder },
  cardContent: { padding: space.lg, gap: space.sm },
  heading: { fontSize: 16, fontWeight: "700", color: colors.text, marginTop: space.sm },
  paragraph: { ...type.body, color: colors.text },
  agreement: { flexDirection: "row", alignItems: "center", gap: space.sm, marginVertical: space.lg },
  agreementText: { ...type.body, flex: 1, color: colors.text },
  logout: { marginTop: space.sm },
});
