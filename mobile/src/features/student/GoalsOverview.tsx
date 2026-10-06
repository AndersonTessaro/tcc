import { useState } from "react";
import { FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useResource } from "@/hooks/use-resource";
import { formatMinutes } from "@/lib/format";
import { apiErrorMessage } from "@/lib/http/errorMessage";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { ChipGroup, type ChipOption } from "@/ui/Chip";
import { ProgressBar } from "@/ui/ProgressBar";
import { ScreenHeader } from "@/ui/ScreenHeader";
import { ScreenState } from "@/ui/ScreenState";
import { TextField } from "@/ui/TextField";
import { useToast } from "@/ui/Toast";
import { colors, radius, space, type } from "@/ui/theme";
import { studentService, type StudentGoal } from "./studentService";

type GoalStatus = StudentGoal["status"];
type GoalType = StudentGoal["type"];

const TAB_OPTIONS: ChipOption<GoalStatus>[] = [
  { value: "ACTIVE", label: "Ativas" },
  { value: "COMPLETED", label: "Concluídas" },
];

const TYPE_OPTIONS: (ChipOption<GoalType> & { unit: string })[] = [
  { value: "PRACTICE_TIME", label: "Tempo de prática", unit: "minutos" },
  { value: "STREAK", label: "Sequência", unit: "dias" },
  { value: "LESSONS", label: "Aulas", unit: "aulas" },
  { value: "ATTENDANCE", label: "Presença", unit: "presenças" },
  { value: "OTHER", label: "Outra", unit: "unidades" },
];

const MAX_INT = 2147483647;

const unitOf = (goalType: GoalType) => TYPE_OPTIONS.find((option) => option.value === goalType)?.unit ?? "";

function progressLabel(goal: StudentGoal): string {
  const current = Math.min(goal.target, goal.currentProgress);
  if (goal.type === "PRACTICE_TIME") return `${formatMinutes(current)} de ${formatMinutes(goal.target)}`;
  return `${current} de ${goal.target} ${unitOf(goal.type)}`;
}

function parseAmount(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const amount = Number(trimmed);
  return Number.isSafeInteger(amount) && amount <= MAX_INT ? amount : null;
}

const fetchActive = () => studentService.goals("ACTIVE");
const fetchCompleted = () => studentService.goals("COMPLETED");

export default function GoalsOverview() {
  const toast = useToast();
  const [tab, setTab] = useState<GoalStatus>("ACTIVE");
  const [editor, setEditor] = useState<StudentGoal | "new" | null>(null);
  const active = useResource(fetchActive);
  const completed = useResource(fetchCompleted);
  const current = tab === "ACTIVE" ? active : completed;

  const handleSaved = (saved: StudentGoal | null) => {
    setEditor(null);
    if (saved?.status === "COMPLETED") {
      toast.show(`Meta concluída: ${saved.title}. Parabéns!`, "success");
    } else {
      toast.show(saved ? "Progresso atualizado" : "Meta criada", "success");
    }
    void active.reload();
    void completed.reload();
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScreenHeader title="Minhas metas" back />
      <View style={styles.toolbar}>
        <ChipGroup role="tab" label="Situação das metas" options={TAB_OPTIONS} value={tab} onChange={setTab} />
        <Button label="Nova meta" icon="add" compact onPress={() => setEditor("new")} />
      </View>
      {current.data ? (
        <FlatList
          data={current.data}
          keyExtractor={(goal) => goal.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={current.refreshing} onRefresh={current.refresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            tab === "ACTIVE"
              ? <ScreenState icon="flag-outline" title="Nenhuma meta ativa" message="Crie uma meta para acompanhar sua evolução." action={{ label: "Criar meta", onPress: () => setEditor("new") }} />
              : <ScreenState icon="trophy-outline" title="Nenhuma meta concluída" message="Suas metas concluídas aparecem aqui." />
          }
          renderItem={({ item }) => <GoalCard goal={item} onUpdate={() => setEditor(item)} />}
        />
      ) : current.error ? (
        <ScreenState message={apiErrorMessage(current.error, "Não foi possível carregar suas metas.")} retry={current.reload} />
      ) : (
        <ScreenState loading skeleton />
      )}
      {editor ? <GoalEditor goal={editor} onClose={() => setEditor(null)} onSaved={handleSaved} /> : null}
    </View>
  );
}

function GoalCard({ goal, onUpdate }: { goal: StudentGoal; onUpdate: () => void }) {
  return (
    <Card style={styles.card}>
      <Text style={styles.cardTitle}>{goal.title}</Text>
      {goal.description ? <Text style={styles.description}>{goal.description}</Text> : null}
      <ProgressBar value={goal.currentProgress} max={goal.target} label={`Progresso de ${goal.title}`} height={8} />
      <Text style={styles.progressText}>{progressLabel(goal)}</Text>
      {goal.status === "ACTIVE" ? (
        <Button label="Atualizar progresso" variant="ghost" compact accessibilityLabel={`Atualizar ${goal.title}`} onPress={onUpdate} style={styles.update} />
      ) : (
        <Text style={styles.completed}>Meta concluída</Text>
      )}
    </Card>
  );
}

type GoalEditorProps = {
  goal: StudentGoal | "new";
  onClose: () => void;
  onSaved: (updated: StudentGoal | null) => void;
};

function GoalEditor({ goal, onClose, onSaved }: GoalEditorProps) {
  const isNew = goal === "new";
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [goalType, setGoalType] = useState<GoalType>(isNew ? "PRACTICE_TIME" : goal.type);
  const [amount, setAmount] = useState(isNew ? "" : String(goal.currentProgress));
  const [errors, setErrors] = useState<{ title?: string; amount?: string }>({});
  const [requestError, setRequestError] = useState("");
  const [saving, setSaving] = useState(false);

  const close = () => {
    if (!saving) onClose();
  };

  const save = async () => {
    const value = parseAmount(amount);
    const nextErrors = {
      title: isNew && !title.trim() ? "Informe um título." : undefined,
      amount: value == null || (isNew && value < 1) ? (isNew ? "Informe um objetivo maior que zero." : "Informe um número inteiro a partir de zero.") : undefined,
    };
    setErrors(nextErrors);
    if (nextErrors.title || nextErrors.amount || value == null) return;
    setSaving(true);
    setRequestError("");
    try {
      if (isNew) {
        await studentService.createGoal(title.trim(), goalType, value, description.trim() || undefined);
        onSaved(null);
      } else {
        onSaved(await studentService.updateGoal(goal.id, value));
      }
    } catch (cause) {
      setRequestError(apiErrorMessage(cause, "Não foi possível salvar a meta. Tente novamente."));
      setSaving(false);
    }
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={close}>
      <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Pressable accessibilityRole="button" accessibilityLabel="Fechar" style={StyleSheet.absoluteFill} onPress={close} />
        <View accessibilityViewIsModal style={styles.editor}>
          <ScrollView contentContainerStyle={styles.editorContent} keyboardShouldPersistTaps="handled">
            <Text accessibilityRole="header" style={styles.editorTitle}>{isNew ? "Nova meta" : goal.title}</Text>
            {isNew ? (
              <>
                <TextField label="Título" value={title} onChangeText={setTitle} maxLength={255} editable={!saving} error={errors.title} returnKeyType="next" />
                <TextField label="Descrição (opcional)" value={description} onChangeText={setDescription} maxLength={255} editable={!saving} multiline />
                <Text style={styles.label}>Tipo</Text>
                <ChipGroup label="Tipo da meta" options={TYPE_OPTIONS} value={goalType} onChange={setGoalType} />
              </>
            ) : null}
            <TextField
              label={`${isNew ? "Objetivo" : "Progresso atual"} (${unitOf(goalType)})`}
              value={amount}
              onChangeText={setAmount}
              keyboardType="number-pad"
              returnKeyType="done"
              onSubmitEditing={save}
              editable={!saving}
              error={errors.amount}
              hint={isNew ? undefined : `Objetivo: ${goal.target}. Ao atingir o objetivo, a meta é concluída.`}
            />
            {requestError ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>{requestError}</Text> : null}
            <Button label="Salvar meta" onPress={save} loading={saving} />
            <Button label="Cancelar" variant="ghost" onPress={close} disabled={saving} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screen },
  toolbar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.sm, paddingHorizontal: space.xl, paddingBottom: space.md, flexWrap: "wrap" },
  list: { flexGrow: 1, paddingHorizontal: space.xl, paddingBottom: space.xxl, gap: space.md },
  card: { gap: space.sm },
  cardTitle: { ...type.bodyStrong },
  description: { ...type.caption, lineHeight: 19 },
  progressText: { ...type.body },
  update: { alignSelf: "flex-start", paddingHorizontal: 0 },
  completed: { ...type.label, color: colors.success },
  backdrop: { flex: 1, backgroundColor: colors.scrim, justifyContent: "center", padding: space.xxl },
  editor: { maxHeight: "90%", backgroundColor: colors.surface, borderRadius: radius.lg },
  editorContent: { padding: space.xl, gap: space.md },
  editorTitle: { ...type.title },
  label: { ...type.label },
  error: { color: colors.danger, fontSize: 13 },
});
