import { useRef, useState } from "react";
import { Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { authService } from "@/features/auth/authService";
import { AuthSheet, authStyles } from "@/features/auth/AuthSheet";
import { apiErrorMessage } from "@/lib/http/errorMessage";
import { Button } from "@/ui/Button";
import { TextField } from "@/ui/TextField";

const MIN_PASSWORD_LENGTH = 8;

type FieldErrors = { token?: string; password?: string; confirmation?: string };

function validate(token: string, password: string, confirmation: string): FieldErrors {
  const errors: FieldErrors = {};
  if (!token.trim()) errors.token = "Informe o token recebido por e-mail.";
  if (password.length < MIN_PASSWORD_LENGTH) errors.password = `A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  if (!confirmation) errors.confirmation = "Confirme a nova senha.";
  else if (password !== confirmation) errors.confirmation = "As senhas não coincidem.";
  return errors;
}

export default function ResetPassword() {
  const params = useLocalSearchParams<{ token?: string }>();
  const router = useRouter();
  const passwordRef = useRef<TextInput>(null);
  const confirmationRef = useRef<TextInput>(null);
  const [token, setToken] = useState(params.token ?? "");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [requestError, setRequestError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const pending = useRef(false);

  const save = async () => {
    if (pending.current || saved) return;
    const nextErrors = validate(token, password, confirmation);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    pending.current = true;
    setSaving(true);
    setRequestError("");
    try {
      await authService.reset(token.trim(), password);
      setSaved(true);
      setPassword("");
      setConfirmation("");
      setToken("");
    } catch (cause) {
      setRequestError(apiErrorMessage(cause, "Não foi possível redefinir a senha. Tente novamente."));
    } finally {
      pending.current = false;
      setSaving(false);
    }
  };

  return (
    <AuthSheet title="Redefinir senha" subtitle={saved ? undefined : "Use o token recebido por e-mail."}>
      {saved ? (
        <Text accessibilityRole="alert" style={authStyles.message}>Senha redefinida. Entre com sua nova senha.</Text>
      ) : (
        <View style={authStyles.form}>
          <TextField
            label="Token de recuperação"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => passwordRef.current?.focus()}
            value={token}
            onChangeText={setToken}
            editable={!saving}
            error={errors.token}
          />
          <TextField
            ref={passwordRef}
            label="Nova senha"
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => confirmationRef.current?.focus()}
            value={password}
            onChangeText={setPassword}
            editable={!saving}
            error={errors.password}
            hint={`Mínimo de ${MIN_PASSWORD_LENGTH} caracteres.`}
          />
          <TextField
            ref={confirmationRef}
            label="Confirmar nova senha"
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="done"
            onSubmitEditing={save}
            value={confirmation}
            onChangeText={setConfirmation}
            editable={!saving}
            error={errors.confirmation}
          />
          {requestError ? (
            <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={authStyles.error}>{requestError}</Text>
          ) : null}
          <Button label="Redefinir senha" onPress={save} loading={saving} />
        </View>
      )}
      <Button label="Voltar ao login" variant="ghost" onPress={() => router.replace("/(auth)/login")} style={authStyles.footer} />
    </AuthSheet>
  );
}
