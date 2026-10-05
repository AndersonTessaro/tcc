import { useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
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

const logoImage = require("@/assets/images/figma-student/login-logo.png");
const emailIcon = require("@/assets/images/figma-student/login-email.png");
const lockIcon = require("@/assets/images/figma-student/login-lock.png");
const hideIcon = require("@/assets/images/figma-student/login-hide.png");

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
      const unsupportedProfile = cause instanceof Error && cause.message === "MOBILE_PROFILE_REQUIRED";
      setError(
        unsupportedProfile ? "O app é destinado a alunos e professores. Use o portal para acessar a administração." : badCredentials ? "Login ou senha inválidos" : "Não foi possível conectar ao servidor",
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
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <View style={styles.brand}>
              <Image source={logoImage} style={styles.logo} accessibilityLabel="Sonetto" />
              <Text style={styles.brandName}>SONETTO</Text>
            </View>

            <View style={styles.formSheet}>
              <Text style={styles.title}>Bem-vindo(a)!</Text>
              <Text style={styles.subtitle}>Faça login para continuar</Text>

              <View style={styles.fields}>
                <View style={styles.field}>
                  <Image source={emailIcon} style={styles.fieldIcon} />
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
                  <Image source={lockIcon} style={styles.fieldIcon} />
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
                    {isPasswordVisible ? <Ionicons name="eye-outline" size={18} color="#666666" /> : <Image source={hideIcon} style={styles.hideIcon} />}
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
              <View style={styles.registerRow}>
                <Text style={styles.registerText}>Não tem uma conta? </Text>
                <Pressable accessibilityRole="button" onPress={() => Alert.alert("Cadastro", "Para criar sua conta, procure a escola.")}>
                  <Text style={styles.registerLink}>Cadastre-se</Text>
                </Pressable>
              </View>
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
  formSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    minHeight: 546,
    paddingHorizontal: 41,
    paddingTop: 34,
    paddingBottom: 40,
  },
  title: { color: "#000000", fontSize: 22, fontWeight: "500", textAlign: "center" },
  subtitle: { color: "#000000", fontSize: 16, fontWeight: "300", textAlign: "center", marginTop: 6 },
  fields: { gap: 19, marginTop: 72 },
  field: {
    alignItems: "center",
    backgroundColor: "#FBF8F8",
    borderColor: "#D1D1D1",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    height: 43,
    paddingHorizontal: 16,
  },
  fieldIcon: { width: 15, height: 15 },
  hideIcon: { width: 18, height: 18 },
  input: { color: "#000000", flex: 1, fontSize: 16, height: "100%", padding: 0 },
  forgotPassword: { alignSelf: "flex-end", color: "#5C2ABA", fontSize: 12, marginTop: 14 },
  error: { color: colors.danger, fontSize: 13, marginTop: 12, textAlign: "center" },
  submit: { borderRadius: 10, marginTop: 56, overflow: "hidden" },
  submitPressed: { opacity: 0.85 },
  submitFill: { alignItems: "center", height: 47, justifyContent: "center" },
  submitText: { color: colors.surface, fontSize: 15, fontWeight: "500" },
  registerRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 39 },
  registerText: { color: "#000000", fontSize: 15, fontWeight: "500" },
  registerLink: { color: "#5C2ABA", fontSize: 15, fontWeight: "500" },
});
