import { useRef, useState } from "react";
import { Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Link } from "expo-router";
import { useAuth } from "@/features/auth/useAuth";
import { AuthSheet, authStyles } from "@/features/auth/AuthSheet";
import { Button } from "@/ui/Button";
import { IconButton } from "@/ui/IconButton";
import { TextField } from "@/ui/TextField";
import { colors, MIN_TOUCH, radius, space, type } from "@/ui/theme";

const emailIcon = require("@/assets/images/figma-student/login-email.png");
const lockIcon = require("@/assets/images/figma-student/login-lock.png");

function loginErrorMessage(cause: unknown): string {
  // Only a 401 means bad credentials; anything else is a client or network fault.
  if (cause instanceof Error && cause.message === "MOBILE_PROFILE_REQUIRED") {
    return "O app é destinado a alunos e professores. Use o portal para acessar a administração.";
  }
  if (cause instanceof Error && cause.message === "HTTP_401") return "Login ou senha inválidos";
  return "Não foi possível conectar ao servidor";
}

export default function Login() {
  const { login, loading } = useAuth();
  const loginRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const [loginValue, setLoginValue] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setPasswordVisible] = useState(false);
  const [error, setError] = useState("");
  const [loginError, setLoginError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const onSubmit = async () => {
    if (loading) return;
    const nextLoginError = loginValue.trim() ? "" : "Informe seu e-mail ou usuário.";
    const nextPasswordError = password ? "" : "Informe sua senha.";
    setLoginError(nextLoginError);
    setPasswordError(nextPasswordError);
    setError("");
    if (nextLoginError || nextPasswordError) {
      (nextLoginError ? loginRef : passwordRef).current?.focus();
      return;
    }
    try {
      await login(loginValue.trim(), password);
    } catch (cause) {
      const message = loginErrorMessage(cause);
      setError(message);
      if (message !== "Login ou senha inválidos") console.warn("login failed", cause);
    }
  };

  return (
    <AuthSheet title="Bem-vindo(a)!" subtitle="Faça login para continuar">
      <View style={authStyles.loginForm}>
        <TextField
          ref={loginRef}
          error={loginError}
          accessibilityLabel="E-mail ou usuário"
          placeholder="seu@email.com"
          leading={<Image source={emailIcon} style={authStyles.fieldIcon} accessible={false} />}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          autoComplete="email"
          textContentType="username"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => passwordRef.current?.focus()}
          value={loginValue}
          onChangeText={(value) => { setLoginValue(value); setLoginError(""); }}
        />
        <TextField
          ref={passwordRef}
          error={passwordError}
          accessibilityLabel="Senha"
          placeholder="Sua senha"
          leading={<Image source={lockIcon} style={authStyles.fieldIcon} accessible={false} />}
          trailing={
            <IconButton
              icon={isPasswordVisible ? "eye-off-outline" : "eye-outline"}
              label={isPasswordVisible ? "Ocultar senha" : "Mostrar senha"}
              size={20}
              color={colors.muted}
              onPress={() => setPasswordVisible((visible) => !visible)}
            />
          }
          secureTextEntry={!isPasswordVisible}
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="done"
          onSubmitEditing={onSubmit}
          value={password}
          onChangeText={(value) => { setPassword(value); setPasswordError(""); }}
        />
      </View>

      {/* Link asChild drops the Pressable's function style on web, so alignment lives on a wrapper. */}
      <View style={styles.forgotRow}>
        <Link href="/(auth)/forgot-password" asChild>
          <Pressable
            accessibilityRole="link"
            style={({ pressed }) => [styles.forgotPassword, pressed && styles.pressed]}
          >
            <Text style={styles.link}>Esqueci minha senha</Text>
          </Pressable>
        </Link>
      </View>

      {error ? (
        <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={[authStyles.error, styles.error]}>{error}</Text>
      ) : null}

      <Button label="Entrar" onPress={onSubmit} loading={loading} style={styles.submit} />

      <Text style={styles.registerText}>Não tem conta? Procure a secretaria da escola.</Text>
    </AuthSheet>
  );
}

const styles = StyleSheet.create({
  forgotRow: { alignItems: "flex-end" },
  forgotPassword: { minHeight: MIN_TOUCH, justifyContent: "center", paddingHorizontal: space.xs, borderRadius: radius.sm },
  pressed: { opacity: 0.6 },
  link: { color: colors.link, fontSize: 13, fontWeight: "500" },
  error: { marginTop: space.md },
  submit: { marginTop: space.xxl + space.lg },
  registerText: { ...type.caption, textAlign: "center", marginTop: space.xxl },
});
