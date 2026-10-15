import { useRef, useState } from "react";
import { Text, TextInput, View } from "react-native";
import { accountService, type Account } from "@/features/account/accountService";
import { MoreScreen, moreStyles as styles } from "@/features/teacher/more/MoreScreen";
import { useResource } from "@/hooks/use-resource";
import { apiErrorMessage } from "@/lib/http/errorMessage";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { StatusChip } from "@/ui/StatusChip";
import { TextField } from "@/ui/TextField";
import { useToast } from "@/ui/Toast";

function ProfileForm({ account, onSaved }: { account: Account; onSaved: (account: Account) => void }) {
  const toast = useToast();
  const nameRef = useRef<TextInput>(null);
  const bioRef = useRef<TextInput>(null);
  const [editedName, setEditedName] = useState<string>();
  const [editedBio, setEditedBio] = useState<string>();
  const displayName = editedName ?? account.displayName;
  const bio = editedBio ?? account.teacher?.bio ?? "";
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; bio?: string; form?: string }>({});
  const save = async () => {
    if (busy) return;
    const found = {
      name: !displayName.trim() ? "Informe seu nome." : displayName.trim().length > 120 ? "Use até 120 caracteres." : undefined,
      bio: bio.length > 500 ? "Use até 500 caracteres." : undefined,
    };
    setErrors(found);
    if (found.name || found.bio) {
      (found.name ? nameRef : bioRef).current?.focus();
      return;
    }
    setBusy(true);
    try {
      onSaved(await accountService.update({ displayName: displayName.trim(), ...(account.teacher ? { bio } : {}) }));
      setEditedName(undefined);
      setEditedBio(undefined);
      toast.show("Perfil atualizado", "success");
    } catch (error) {
      setErrors({ form: apiErrorMessage(error, "Não foi possível salvar o perfil.") });
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card style={styles.card}>
      <TextField ref={nameRef} label="Nome" value={displayName} onChangeText={(value) => setEditedName(value === account.displayName ? undefined : value)} error={errors.name} editable={!busy} />
      <TextField label="E-mail" value={account.email} editable={false} />
      <TextField label="Usuário" value={account.username} editable={false} />
      <Text style={styles.caption}>Para alterar, fale com a secretaria</Text>
      {account.teacher ? <>
        <TextField ref={bioRef} label="Bio" value={bio} onChangeText={(value) => setEditedBio(value === (account.teacher?.bio ?? "") ? undefined : value)} error={errors.bio} multiline editable={!busy} />
        <Text accessibilityRole="header" style={styles.heading}>Instrumentos</Text>
        <View style={styles.row}>{account.teacher.instruments.map((instrument) => <StatusChip key={instrument.id} label={instrument.name} tone="info" />)}</View>
        {!account.teacher.instruments.length ? <Text style={styles.caption}>Nenhum instrumento vinculado</Text> : null}
      </> : null}
      {errors.form ? <Text accessibilityRole="alert" style={styles.error}>{errors.form}</Text> : null}
      <Button label="Salvar" loading={busy} onPress={save} />
    </Card>
  );
}

export default function Profile() {
  const account = useResource(accountService.get);
  return (
    <MoreScreen title="Perfil" resource={account}>
      {account.data ? <ProfileForm key={account.data.username} account={account.data} onSaved={(saved) => account.setData(() => saved)} /> : null}
    </MoreScreen>
  );
}
