import { useRef, useState } from "react";
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { authService } from "@/features/auth/authService";
import { apiErrorMessage } from "@/lib/http/errorMessage";
import { brandGradient, colors } from "@/ui/theme";

const logoImage = require("@/assets/images/figma-student/login-logo.png");
const emailIcon = require("@/assets/images/figma-student/login-email.png");

export default function Forgot() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);

  const onSubmit = async () => {
    if (pending.current) return;
    const address = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
      setError("Informe um e-mail válido.");
      return;
    }
    pending.current = true;
    setSaving(true);
    setError("");
    try {
      await authService.forgot(address);
      setSent(true);
    } catch (cause) {
      setError(apiErrorMessage(cause, "Não foi possível enviar as instruções. Tente novamente."));
    } finally {
      pending.current = false;
      setSaving(false);
    }
  };

  return (
    <LinearGradient colors={brandGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.screen}>
      <SafeAreaView style={styles.screen} edges={["top"]}>
        <KeyboardAvoidingView style={styles.screen} behavior={Platform.select({ ios: "padding", default: undefined })}>
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <View style={styles.brand}><Image source={logoImage} style={styles.logo} accessibilityLabel="Sonetto" /><Text style={styles.brandName}>SONETTO</Text></View>
            <View style={styles.formSheet}>
              <Text accessibilityRole="header" style={styles.title}>Recuperar senha</Text>
              <Text style={styles.subtitle}>{sent ? "Confira sua caixa de entrada" : "Informe o e-mail da sua conta"}</Text>
              {sent ? <><Text accessibilityRole="alert" style={styles.confirmation}>Se o e-mail estiver cadastrado, você receberá as instruções para recuperar sua senha.</Text><Pressable accessibilityRole="button" onPress={() => router.push("/(auth)/reset-password")} style={styles.backButton}><Text style={styles.backText}>Já tenho o token de recuperação</Text></Pressable></> : <>
                <View style={styles.field}><Image source={emailIcon} style={styles.fieldIcon} /><TextInput accessibilityLabel="E-mail" placeholder="seu@email.com" placeholderTextColor={colors.placeholder} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" value={email} onChangeText={setEmail} editable={!saving} onSubmitEditing={onSubmit} style={styles.input} /></View>
                {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
                <Pressable accessibilityRole="button" accessibilityState={{ disabled: saving }} disabled={saving} onPress={onSubmit} style={[styles.submit, saving && styles.disabled]}><LinearGradient colors={brandGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.submitFill}><Text style={styles.submitText}>{saving ? "Enviando..." : "Enviar instruções"}</Text></LinearGradient></Pressable>
              </>}
              <Pressable accessibilityRole="button" onPress={() => router.replace("/(auth)/login")} style={styles.backButton}><Text style={styles.backText}>Voltar ao login</Text></Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  brand: { flex: 1, minHeight: 240, alignItems: "center", justifyContent: "center" },
  logo: { width: 108, height: 202 },
  brandName: { color: colors.surface, fontSize: 30, fontWeight: "500", letterSpacing: 0.5, marginTop: 10 },
  formSheet: { backgroundColor: colors.surface, borderTopLeftRadius: 35, borderTopRightRadius: 35, minHeight: 546, paddingHorizontal: 41, paddingTop: 34, paddingBottom: 40 },
  title: { color: "#000000", fontSize: 22, fontWeight: "500", textAlign: "center" },
  subtitle: { color: "#000000", fontSize: 16, fontWeight: "300", textAlign: "center", marginTop: 6 },
  field: { alignItems: "center", backgroundColor: "#FBF8F8", borderColor: "#D1D1D1", borderRadius: 8, borderWidth: 1, flexDirection: "row", gap: 12, height: 43, paddingHorizontal: 16, marginTop: 72 },
  fieldIcon: { width: 15, height: 15 },
  input: { color: "#000000", flex: 1, fontSize: 16, height: "100%", padding: 0 },
  error: { color: colors.danger, fontSize: 13, marginTop: 12, textAlign: "center" },
  confirmation: { color: colors.muted, fontSize: 16, lineHeight: 25, textAlign: "center", marginTop: 72 },
  submit: { borderRadius: 10, marginTop: 56, overflow: "hidden" },
  disabled: { opacity: 0.65 },
  submitFill: { alignItems: "center", minHeight: 47, justifyContent: "center", padding: 12 },
  submitText: { color: colors.surface, fontSize: 15, fontWeight: "500" },
  backButton: { alignSelf: "center", padding: 12, marginTop: 27 },
  backText: { color: "#5C2ABA", fontSize: 15, fontWeight: "500" },
});
