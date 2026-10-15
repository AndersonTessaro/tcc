import { useRef, useState } from "react";
import { Text, TextInput } from "react-native";
import Constants from "expo-constants";
import { accountService } from "@/features/account/accountService";
import { useAuth } from "@/features/auth/useAuth";
import { MoreScreen, moreStyles as styles } from "@/features/teacher/more/MoreScreen";
import { ApiError } from "@/lib/http/apiError";
import { apiErrorMessage } from "@/lib/http/errorMessage";
import { tokenStorage } from "@/lib/http/tokenStorage";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { IconButton } from "@/ui/IconButton";
import { TextField } from "@/ui/TextField";
import { useToast } from "@/ui/Toast";

type PasswordField = "currentPassword" | "newPassword" | "confirmation";
type Errors = Partial<Record<PasswordField | "form", string>>;
const fields: { key: PasswordField; label: string }[] = [
  { key: "currentPassword", label: "Senha atual" },
  { key: "newPassword", label: "Nova senha" },
  { key: "confirmation", label: "Confirmar nova senha" },
];

export default function Settings() {
  const { logout } = useAuth();
  const toast = useToast();
  const currentRef = useRef<TextInput>(null);
  const newRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);
  const refs = { currentPassword: currentRef, newPassword: newRef, confirmation: confirmRef };
  const [values, setValues] = useState({ currentPassword: "", newPassword: "", confirmation: "" });
  const [visible, setVisible] = useState<Partial<Record<PasswordField, boolean>>>({});
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const changePassword = async () => {
    if (busy) return;
    const found: Errors = {};
    if (!values.currentPassword) found.currentPassword = "Informe sua senha atual.";
    if (!values.newPassword.trim() || values.newPassword.length < 8) found.newPassword = "Use pelo menos 8 caracteres.";
    else if (new TextEncoder().encode(values.newPassword).length > 72) found.newPassword = "Use até 72 bytes na nova senha.";
    else if (values.newPassword === values.currentPassword) found.newPassword = "A nova senha deve ser diferente da atual.";
    if (!values.confirmation || values.confirmation !== values.newPassword) found.confirmation = "As senhas não coincidem.";
    setErrors(found);
    const first = fields.find(({ key }) => found[key]);
    if (first) {
      refs[first.key].current?.focus();
      return;
    }
    setBusy(true);
    try {
      await accountService.changePassword({ currentPassword: values.currentPassword, newPassword: values.newPassword });
    } catch (error) {
      const field = error instanceof ApiError && error.status === 422 && /Current password is incorrect/i.test(error.detail ?? "")
        ? "currentPassword" : error instanceof ApiError && error.status === 422 && /New password must differ/i.test(error.detail ?? "") ? "newPassword" : "form";
      setErrors({ [field]: apiErrorMessage(error, "Não foi possível trocar a senha.") });
      if (field !== "form") refs[field].current?.focus();
      setBusy(false);
      return;
    }
    toast.show("Senha alterada. Entre novamente.", "success");
    try {
      await tokenStorage.clear();
    } catch {
      toast.show("Não foi possível limpar a sessão salva. A senha já foi alterada.", "error");
    } finally {
      logout();
    }
  };
  return (
    <MoreScreen title="Configurações">
      <Card style={styles.card}>
        <Text accessibilityRole="header" style={styles.heading}>Segurança</Text>
        {fields.map(({ key, label }, index) => (
          <TextField key={key} ref={refs[key]} label={label} value={values[key]} error={errors[key]} editable={!busy}
            secureTextEntry={!visible[key]} autoCapitalize="none" autoCorrect={false}
            autoComplete={key === "currentPassword" ? "current-password" : "new-password"}
            textContentType={key === "currentPassword" ? "password" : "newPassword"}
            onChangeText={(value) => { setValues((previous) => ({ ...previous, [key]: value })); setErrors((previous) => ({ ...previous, [key]: undefined })); }}
            returnKeyType={index === 2 ? "done" : "next"} submitBehavior="submit"
            onSubmitEditing={() => index === 2 ? void changePassword() : refs[fields[index + 1].key].current?.focus()}
            trailing={<IconButton icon={visible[key] ? "eye-off-outline" : "eye-outline"} label={`${visible[key] ? "Ocultar" : "Mostrar"} ${label.toLowerCase()}`}
              onPress={() => setVisible((previous) => ({ ...previous, [key]: !previous[key] }))} />} />
        ))}
        {errors.form ? <Text accessibilityRole="alert" style={styles.error}>{errors.form}</Text> : null}
        <Button label="Trocar senha" loading={busy} onPress={changePassword} />
      </Card>
      <Card style={styles.card}>
        <Text accessibilityRole="header" style={styles.heading}>Sobre</Text>
        <Text style={styles.body}>Versão {Constants.expoConfig?.version ?? "Não disponível"}</Text>
      </Card>
    </MoreScreen>
  );
}
