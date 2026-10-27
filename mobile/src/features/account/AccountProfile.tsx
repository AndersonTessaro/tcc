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
import { ProfilePhoto } from "./ProfilePhoto";
import { useAuth } from "@/features/auth/useAuth";

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <View accessible accessibilityLabel={`${label}: ${value}`}>
      <Text style={styles.caption}>{label}</Text>
      <Text style={styles.body}>{value}</Text>
    </View>
  );
}

function ProfileForm({ account, onSaved, onPhotoChanged }: { account: Account; onSaved: (account: Account) => void; onPhotoChanged: (hasAvatar: boolean) => void }) {
  const toast = useToast();
  const nameRef = useRef<TextInput>(null);
  const bioRef = useRef<TextInput>(null);
  const mutationLock = useRef(false);
  const [editedName, setEditedName] = useState<string>();
  const [editedBio, setEditedBio] = useState<string>();
  const displayName = editedName ?? account.displayName;
  const hasBio = Boolean(account.teacher || account.student);
  const savedBio = account.teacher?.bio ?? account.student?.bio ?? "";
  const bio = editedBio ?? savedBio;
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; bio?: string; form?: string }>({});
  const save = async () => {
    if (mutationLock.current) return;
    const found = {
      name: !displayName.trim() ? "Informe seu nome." : displayName.trim().length > 120 ? "Use até 120 caracteres." : undefined,
      bio: bio.length > 500 ? "Use até 500 caracteres." : undefined,
    };
    setErrors(found);
    if (found.name || found.bio) {
      (found.name ? nameRef : bioRef).current?.focus();
      return;
    }
    mutationLock.current = true;
    setBusy(true);
    try {
      onSaved(await accountService.update({ displayName: displayName.trim(), ...(hasBio ? { bio } : {}) }));
      setEditedName(undefined);
      setEditedBio(undefined);
      toast.show("Perfil atualizado", "success");
    } catch (error) {
      setErrors({ form: apiErrorMessage(error, "Não foi possível salvar o perfil.") });
    } finally {
      mutationLock.current = false;
      setBusy(false);
    }
  };
  return (
    <>
      <ProfilePhoto hasAvatar={account.hasAvatar} onChanged={onPhotoChanged} mutationLock={mutationLock} disabled={busy} onBusyChange={setPhotoBusy} />
      <Card style={styles.card}>
        <TextField ref={nameRef} label="Nome" value={displayName} onChangeText={(value) => setEditedName(value === account.displayName ? undefined : value)} error={errors.name} editable={!busy} />
        <ReadOnlyField label="E-mail" value={account.email} />
        <ReadOnlyField label="Usuário" value={account.username} />
        <Text style={styles.caption}>Para alterar, fale com a secretaria</Text>
        {hasBio ? <TextField ref={bioRef} label="Bio" value={bio} onChangeText={(value) => setEditedBio(value === savedBio ? undefined : value)} error={errors.bio} multiline editable={!busy} /> : null}
        {account.teacher ? <>
          <Text accessibilityRole="header" style={styles.heading}>Instrumentos</Text>
          <View style={styles.row}>{account.teacher.instruments.map((instrument) => <StatusChip key={instrument.id} label={instrument.name} tone="info" />)}</View>
          {!account.teacher.instruments.length ? <Text style={styles.caption}>Nenhum instrumento vinculado</Text> : null}
        </> : null}
        {errors.form ? <Text accessibilityRole="alert" style={styles.error}>{errors.form}</Text> : null}
        <Button label="Salvar" loading={busy} disabled={photoBusy} onPress={() => { void save(); }} />
      </Card>
    </>
  );
}

export default function AccountProfile() {
  const account = useResource(accountService.get);
  const auth = useAuth();
  const saved = (updated: Account) => {
    account.setData(() => updated);
    auth?.updateProfile?.({ displayName: updated.displayName, hasAvatar: updated.hasAvatar });
  };
  const photoChanged = (hasAvatar: boolean) => {
    account.setData((current) => current && { ...current, hasAvatar });
    auth?.updateProfile?.({ hasAvatar });
  };
  return (
    <MoreScreen title="Perfil" resource={account}>
      {account.data ? <ProfileForm key={account.data.username} account={account.data} onSaved={saved} onPhotoChanged={photoChanged} /> : null}
    </MoreScreen>
  );
}
