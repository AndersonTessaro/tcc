import { useEffect, useMemo, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useResource } from "@/hooks/use-resource";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";
import { apiErrorMessage } from "@/lib/http/errorMessage";
import { Button } from "@/ui/Button";
import { ChipGroup } from "@/ui/Chip";
import { ScreenHeader } from "@/ui/ScreenHeader";
import { ScreenState } from "@/ui/ScreenState";
import { TextField } from "@/ui/TextField";
import { useToast } from "@/ui/Toast";
import { colors, space, type } from "@/ui/theme";
import { FIELDS, fieldFromApiError, validateStudentForm, type StudentFormErrors, type StudentFormField, type StudentFormValues } from "./studentForm";
import { teacherService, type TeacherInstrument, type TeacherStudentProfile } from "./teacherService";

const readOnlyProps = { fieldStyle: { backgroundColor: colors.screen }, style: { color: colors.muted }, hint: "Só a administração pode alterar." };

const emptyValues: StudentFormValues = { name: "", email: "", username: "", password: "", phone: "", instrumentId: "", sharedNotes: "", privateNotes: "" };

async function loadForm(id?: string): Promise<{ profile: TeacherStudentProfile | null; instruments: TeacherInstrument[] }> {
  if (id) return { profile: await teacherService.studentProfile(id), instruments: [] };
  return { profile: null, instruments: await teacherService.instruments() };
}

export default function TeacherStudentForm({ id }: { id?: string }) {
  const router = useRouter();
  const toast = useToast();
  const resource = useResource(() => loadForm(id), id ?? "", { refetchOnFocus: false });
  const initial = useMemo<StudentFormValues>(() => {
    const profile = resource.data?.profile;
    if (profile) return { ...emptyValues, ...profile, phone: profile.phone ?? "", sharedNotes: profile.sharedNotes ?? "", privateNotes: profile.privateNotes ?? "" };
    const instruments = resource.data?.instruments ?? [];
    return { ...emptyValues, instrumentId: instruments.length === 1 ? instruments[0].id : "" };
  }, [resource.data]);
  const [values, setValues] = useState(emptyValues);
  const [errors, setErrors] = useState<StudentFormErrors & { form?: string }>({});
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const pendingFocus = useRef(false);
  const mounted = useRef(true);
  const scrollRef = useRef<ScrollView>(null);
  const inputs = useRef<Partial<Record<StudentFormField, TextInput | null>>>({});
  const instrumentRef = useRef<View>(null);
  const positions = useRef<Partial<Record<StudentFormField, number>>>({});
  useEffect(() => setValues(initial), [initial]);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const dirty = !!resource.data && (Object.keys(emptyValues) as (keyof StudentFormValues)[]).some(field => values[field] !== initial[field]);
  const markSaved = useUnsavedChangesGuard(dirty);

  useEffect(() => {
    if (saving || !pendingFocus.current) return;
    pendingFocus.current = false;
    const field = FIELDS.find(key => errors[key]);
    if (!field) return;
    if (field === "instrument") instrumentRef.current?.focus();
    else inputs.current[field]?.focus();
    scrollRef.current?.scrollTo({ y: Math.max(0, (positions.current[field] ?? 0) - space.sm), animated: true });
  }, [errors, saving]);

  const change = (field: keyof StudentFormValues, value: string) => {
    setValues(current => ({ ...current, [field]: value }));
    const errorField = field === "instrumentId" ? "instrument" : field;
    setErrors(current => ({ ...current, [errorField]: undefined, form: undefined }));
  };
  const fieldProps = (field: Exclude<StudentFormField, "instrument">) => ({
    ref: (input: TextInput | null) => { inputs.current[field] = input; },
    value: values[field],
    onChangeText: (value: string) => change(field, value),
    editable: !saving,
    error: errors[field],
  });

  const positionProps = (field: StudentFormField) => ({
    onLayout: (event: { nativeEvent: { layout: { y: number } } }) => { positions.current[field] = event.nativeEvent.layout.y; },
  });

  const save = async () => {
    if (savingRef.current) return;
    const found = validateStudentForm(values, id ? "edit" : "create");
    pendingFocus.current = FIELDS.some(field => found[field]);
    setErrors(found);
    if (pendingFocus.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      const editable = { name: values.name.trim(), phone: values.phone.trim() || null, sharedNotes: values.sharedNotes.trim(), privateNotes: values.privateNotes.trim() };
      const student = id
        ? await teacherService.updateStudentProfile(id, editable)
        : await teacherService.createStudent({ ...editable, email: values.email.trim(), username: values.username.trim(), password: values.password, instrumentId: values.instrumentId });
      if (!mounted.current) return;
      markSaved();
      toast.show(id ? "Alterações salvas." : "Aluno cadastrado.", "success");
      if (id) router.back();
      else router.replace({ pathname: "/teacher/student/[id]", params: { id: student.id } });
    } catch (error) {
      if (!mounted.current) return;
      const field = fieldFromApiError(error);
      pendingFocus.current = field !== null;
      setErrors({ [field ?? "form"]: apiErrorMessage(error, "Não foi possível salvar o aluno.") });
    } finally {
      savingRef.current = false;
      if (mounted.current) setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScreenHeader title={id ? "Editar aluno" : "Novo aluno"} back onBack={() => { if (!savingRef.current) router.back(); }} />
      {resource.loading ? <ScreenState loading skeleton /> : resource.error || !resource.data ? (
        <ScreenState message={apiErrorMessage(resource.error, "Não foi possível carregar o formulário.")} retry={resource.reload} />
      ) : !id && !resource.data.instruments.length ? (
        <ScreenState icon="musical-notes-outline" message="Você ainda não ensina nenhum instrumento cadastrado. Peça à administração." />
      ) : (
        <>
          <ScrollView ref={scrollRef} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
            <View {...positionProps("name")}>
              <TextField label="Nome" {...fieldProps("name")} maxLength={150} autoCapitalize="words" />
            </View>
            <View {...positionProps("email")}>
              <TextField label="E-mail" {...fieldProps("email")} {...(id ? readOnlyProps : null)} editable={!id && !saving} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} maxLength={255} />
            </View>
            <View {...positionProps("username")}>
              <TextField label="Usuário (login)" {...fieldProps("username")} {...(id ? readOnlyProps : null)} editable={!id && !saving} autoCapitalize="none" autoCorrect={false} maxLength={100} />
            </View>
            {!id ? <View {...positionProps("password")}><TextField label="Senha inicial" {...fieldProps("password")} secureTextEntry autoCapitalize="none" autoCorrect={false} hint="Informe esta senha ao aluno." /></View> : null}
            <View {...positionProps("phone")}>
              <TextField label="Telefone (opcional)" {...fieldProps("phone")} keyboardType="phone-pad" maxLength={20} />
            </View>
            {!id ? (
              <View ref={instrumentRef} focusable onLayout={event => { positions.current.instrument = event.nativeEvent.layout.y; }} style={styles.instrument}>
                <Text style={styles.label}>Instrumento</Text>
                <ChipGroup label="Instrumento" options={resource.data.instruments.map(item => ({ value: item.id, label: item.name }))} value={values.instrumentId} onChange={value => change("instrumentId", value)} disabled={saving} />
                {errors.instrument ? <Text accessibilityLiveRegion="polite" style={styles.error}>{errors.instrument}</Text> : null}
              </View>
            ) : null}
            <View {...positionProps("sharedNotes")}>
              <TextField label="Observação para o aluno" {...fieldProps("sharedNotes")} multiline maxLength={1000} hint="O aluno vê esta observação." />
            </View>
            <View {...positionProps("privateNotes")}>
              <TextField label="Anotações do professor" {...fieldProps("privateNotes")} multiline maxLength={1000} hint="Visível só para você." />
            </View>
            {errors.form ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>{errors.form}</Text> : null}
          </ScrollView>
          <View style={styles.footer}>
            <Button label={id ? "Salvar alterações" : "Cadastrar aluno"} onPress={save} loading={saving} disabled={saving} />
          </View>
        </>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screen },
  content: { padding: space.screenGutter, gap: space.lg },
  footer: { paddingHorizontal: space.screenGutter, paddingTop: space.md, paddingBottom: space.xl },
  instrument: { gap: space.sm },
  label: { ...type.label },
  error: { color: colors.danger, fontSize: 13 },
});
