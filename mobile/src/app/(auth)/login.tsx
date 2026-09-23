import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/features/auth/useAuth";
import { brandGradient, colors } from "@/ui/theme";

export default function Login() {
  const { login, loading } = useAuth();
  const [loginValue, setLoginValue] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setPasswordVisible] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async () => {
    setError("");
    try {
      await login(loginValue, password);
    } catch (cause) {
      // Only a 401 means bad credentials; anything else is a client or network
      // fault and must not be reported as a wrong password.
      const badCredentials = cause instanceof Error && cause.message === "HTTP_401";
      setError(
        badCredentials ? "Login ou senha inválidos" : "Não foi possível conectar ao servidor",
      );
      if (!badCredentials) console.warn("login failed", cause);
    }
  };

  return (
    <LinearGradient colors={brandGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.screen}>
      <SafeAreaView style={styles.screen} edges={["top"]}>
        <KeyboardAvoidingView
          style={styles.screen}
          behavior={Platform.select({ ios: "padding", default: undefined })}
        >
          <View style={styles.brand}>
            <Ionicons name="musical-note" size={150} color={colors.surface} accessibilityLabel="Sonetto" />
            <Text style={styles.brandName}>SONETTO</Text>
          </View>

          <View style={styles.formSheet}>
            <Text style={styles.title}>Bem-vindo(a)!</Text>
            <Text style={styles.subtitle}>Faça login para continuar</Text>

            <View style={styles.fields}>
              <View style={styles.field}>
                <Ionicons name="mail-outline" size={18} color={colors.muted} />
                <TextInput
                  accessibilityLabel="E-mail ou usuário"
                  style={styles.input}
                  placeholder="seu@email.com"
                  placeholderTextColor={colors.placeholder}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  value={loginValue}
                  onChangeText={setLoginValue}
                />
              </View>
              <View style={styles.field}>
                <Ionicons name="lock-closed-outline" size={18} color={colors.muted} />
                <TextInput
                  accessibilityLabel="Senha"
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor={colors.placeholder}
                  secureTextEntry={!isPasswordVisible}
                  value={password}
                  onChangeText={setPassword}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={isPasswordVisible ? "Ocultar senha" : "Mostrar senha"}
                  hitSlop={12}
                  onPress={() => setPasswordVisible((visible) => !visible)}
                >
                  <Ionicons
                    name={isPasswordVisible ? "eye-outline" : "eye-off-outline"}
                    size={20}
                    color={colors.muted}
                  />
                </Pressable>
              </View>
            </View>

            <Link href="/(auth)/forgot-password" style={styles.forgotPassword}>
              Esqueci minha senha
            </Link>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: loading }}
              onPress={onSubmit}
              disabled={loading}
              style={({ pressed }) => [styles.submit, (pressed || loading) && styles.submitPressed]}
            >
              <LinearGradient colors={brandGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.submitFill}>
                <Text style={styles.submitText}>{loading ? "Entrando..." : "Entrar"}</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  brand: { flex: 1, minHeight: 240, alignItems: "center", justifyContent: "center" },
  brandName: { color: colors.surface, fontSize: 24, fontWeight: "500", letterSpacing: 0.5, marginTop: 4 },
  formSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 40,
    paddingTop: 28,
    paddingBottom: 48,
  },
  title: { color: colors.text, fontSize: 22, fontWeight: "700", textAlign: "center" },
  subtitle: { color: colors.muted, fontSize: 15, textAlign: "center", marginTop: 6 },
  fields: { gap: 14, marginTop: 48 },
  field: {
    alignItems: "center",
    backgroundColor: colors.field,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    height: 50,
    paddingHorizontal: 14,
  },
  input: { color: colors.text, flex: 1, fontSize: 15, height: "100%", padding: 0 },
  forgotPassword: { alignSelf: "flex-end", color: colors.link, fontSize: 12, marginTop: 12 },
  error: { color: colors.danger, fontSize: 13, marginTop: 12, textAlign: "center" },
  submit: { borderRadius: 8, marginTop: 44, overflow: "hidden" },
  submitPressed: { opacity: 0.85 },
  submitFill: { alignItems: "center", height: 50, justifyContent: "center" },
  submitText: { color: colors.surface, fontSize: 15, fontWeight: "600" },
});
