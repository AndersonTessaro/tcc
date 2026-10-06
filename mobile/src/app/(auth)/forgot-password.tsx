import { useRef, useState } from "react";
import { Image, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { authService } from "@/features/auth/authService";
import { AuthSheet, authStyles } from "@/features/auth/AuthSheet";
import { apiErrorMessage } from "@/lib/http/errorMessage";
import { Button } from "@/ui/Button";
import { TextField } from "@/ui/TextField";

const emailIcon = require("@/assets/images/figma-student/login-email.png");
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Forgot() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fieldError, setFieldError] = useState("");
  const [requestError, setRequestError] = useState("");
  const pending = useRef(false);

  const onSubmit = async () => {
    if (pending.current) return;
    const address = email.trim();
    if (!EMAIL_PATTERN.test(address)) {
      setFieldError("Informe um e-mail válido.");
      return;
    }
    pending.current = true;
    setSaving(true);
    setFieldError("");
    setRequestError("");
    try {
      await authService.forgot(address);
      setSent(true);
    } catch (cause) {
      setRequestError(apiErrorMessage(cause, "Não foi possível enviar as instruções. Tente novamente."));
    } finally {
      pending.current = false;
      setSaving(false);
    }
  };

  return (
    <AuthSheet title="Recuperar senha" subtitle={sent ? "Confira sua caixa de entrada" : "Informe o e-mail da sua conta"}>
      {sent ? (
        <>
          <Text accessibilityRole="alert" style={authStyles.message}>
            Se o e-mail estiver cadastrado, você receberá as instruções para recuperar sua senha.
          </Text>
          <Button label="Já tenho o token de recuperação" variant="secondary" onPress={() => router.push("/(auth)/reset-password")} style={authStyles.footer} />
        </>
      ) : (
        <View style={authStyles.form}>
          <TextField
            accessibilityLabel="E-mail"
            placeholder="seu@email.com"
            leading={<Image source={emailIcon} style={authStyles.fieldIcon} accessible={false} />}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="send"
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              if (fieldError) setFieldError("");
            }}
            editable={!saving}
            onSubmitEditing={onSubmit}
            error={fieldError}
          />
          {requestError ? (
            <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={authStyles.error}>{requestError}</Text>
          ) : null}
          <Button label="Enviar instruções" onPress={onSubmit} loading={saving} />
        </View>
      )}
      <Button label="Voltar ao login" variant="ghost" onPress={() => router.replace("/(auth)/login")} style={authStyles.footer} />
    </AuthSheet>
  );
}
