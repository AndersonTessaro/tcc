import { useRef, useState } from "react";
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { authService } from "@/features/auth/authService";
import { apiErrorMessage } from "@/lib/http/errorMessage";
import { brandGradient } from "@/ui/theme";

export default function ResetPassword() {
  const params = useLocalSearchParams<{ token?: string }>();
  const router = useRouter();
  const [token, setToken] = useState(params.token ?? "");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const pending = useRef(false);
  const save = async () => {
    if (pending.current || saved) return;
    if (!token.trim() || password.length < 8 || password !== confirmation) {
      setMessage("Informe o token e confirme uma senha com pelo menos 8 caracteres.");
      return;
    }
    pending.current = true;
    setSaving(true);
    setMessage("");
    try {
      await authService.reset(token.trim(), password);
      setSaved(true);
      setPassword(""); setConfirmation(""); setToken("");
    } catch (cause) { setMessage(apiErrorMessage(cause, "Não foi possível redefinir a senha. Tente novamente.")); }
    finally { pending.current = false; setSaving(false); }
  };
  return <LinearGradient colors={brandGradient} style={styles.screen}>
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.brand}><Image source={require("@/assets/images/figma-student/login-logo.png")} style={styles.logo} /><Text style={styles.brandName}>SONETTO</Text></View>
          <View style={styles.sheet}>
            <Text style={styles.title}>Redefinir senha</Text>
            {saved ? <Text accessibilityRole="alert" style={styles.success}>Senha redefinida. Entre com sua nova senha.</Text> : <>
              <Text style={styles.description}>Use o token recebido por e-mail.</Text>
              <TextInput accessibilityLabel="Token de recuperação" placeholder="Token de recuperação" autoCapitalize="none" autoCorrect={false} value={token} onChangeText={setToken} editable={!saving} style={styles.input} />
              <TextInput accessibilityLabel="Nova senha" placeholder="Nova senha" secureTextEntry value={password} onChangeText={setPassword} editable={!saving} style={styles.input} />
              <TextInput accessibilityLabel="Confirmar nova senha" placeholder="Confirmar nova senha" secureTextEntry value={confirmation} onChangeText={setConfirmation} editable={!saving} style={styles.input} />
              {message ? <Text accessibilityRole="alert" style={styles.error}>{message}</Text> : null}
              <Pressable accessibilityRole="button" disabled={saving} onPress={save} style={styles.submit}><Text style={styles.submitText}>{saving ? "Salvando..." : "Redefinir senha"}</Text></Pressable>
            </>}
            <Pressable accessibilityRole="button" onPress={() => router.replace("/(auth)/login")} style={styles.back}><Text style={styles.link}>Voltar ao login</Text></Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  </LinearGradient>;
}
const styles = StyleSheet.create({
  screen: { flex: 1 }, content: { flexGrow: 1 },
  brand: { minHeight: 240, flex: 1, alignItems: "center", justifyContent: "center" },
  logo: { width: 108, height: 202 }, brandName: { color: "#FFFFFF", fontSize: 30, marginTop: 10 },
  sheet: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 35, borderTopRightRadius: 35, padding: 34, minHeight: 500 },
  title: { color: "#17131A", fontSize: 22, fontWeight: "500", textAlign: "center", marginBottom: 16 },
  description: { color: "#6A666B", textAlign: "center", marginBottom: 24 },
  input: { borderWidth: 1, borderColor: "#D1D1D1", borderRadius: 8, backgroundColor: "#FBF8F8", padding: 14, marginBottom: 16, color: "#17131A" },
  error: { color: "#B42318", marginBottom: 16 }, success: { color: "#17131A", textAlign: "center", marginVertical: 32 },
  submit: { backgroundColor: "#572AA8", borderRadius: 10, padding: 16, alignItems: "center" }, submitText: { color: "#FFFFFF", fontWeight: "600" },
  back: { alignItems: "center", padding: 16, marginTop: 16 }, link: { color: "#572AA8", fontSize: 15 },
});
