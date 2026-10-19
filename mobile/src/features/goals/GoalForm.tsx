import { useRef, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { confirm } from "@/lib/confirm";
import { apiErrorMessage } from "@/lib/http/errorMessage";
import { Button } from "@/ui/Button";
import { ChipGroup } from "@/ui/Chip";
import { DurationInput } from "@/ui/DurationInput";
import { IconButton } from "@/ui/IconButton";
import { TextField } from "@/ui/TextField";
import { colors, radius, space, type } from "@/ui/theme";
import type { GoalPeriod, GoalType, NewGoal } from "./goalService";
import { DURATION_SHORTCUTS, GOAL_PERIODS, GOAL_TYPES, MAX_GOAL_TARGET, MAX_PRACTICE_DAYS, suggestedGoalTitle } from "./goalText";

type GoalFormProps = {
  onSubmit: (body: NewGoal) => Promise<unknown>;
  onSaved: () => void;
  onClose: () => void;
};

export function GoalForm({ onSubmit, onSaved, onClose }: GoalFormProps) {
  const reducedMotion = useReducedMotion();
  const pending = useRef(false);
  const closing = useRef(false);
  const [goalType, setGoalType] = useState<GoalType>("PRACTICE_TIME");
  const [period, setPeriod] = useState<GoalPeriod>("WEEKLY");
  const [target, setTarget] = useState<number | null>(180);
  const [customTitle, setCustomTitle] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [targetError, setTargetError] = useState("");
  const [requestError, setRequestError] = useState("");
  const suggestion = suggestedGoalTitle(goalType, period, target ?? 0);
  const max = goalType === "PRACTICE_DAYS" ? MAX_PRACTICE_DAYS[period] : MAX_GOAL_TARGET;

  const changeTarget = (value: number | null) => {
    setDirty(true);
    setTargetError("");
    setTarget(value);
  };
  const changeType = (value: GoalType) => {
    setDirty(true);
    setGoalType(value);
    setTargetError("");
    setTarget(value === "PRACTICE_TIME" ? DURATION_SHORTCUTS[period][0] : value === "PRACTICE_DAYS" ? Math.min(5, MAX_PRACTICE_DAYS[period]) : 1);
  };
  const changePeriod = (value: GoalPeriod) => {
    setDirty(true);
    setPeriod(value);
    setTargetError("");
    if (goalType === "PRACTICE_DAYS") setTarget((current) => Math.min(current ?? 1, MAX_PRACTICE_DAYS[value]));
  };
  const close = async () => {
    if (pending.current || closing.current) return;
    closing.current = true;
    try {
      if (!dirty || await confirm({ title: "Descartar alterações?", message: "Os dados preenchidos serão perdidos.", confirmLabel: "Descartar", destructive: true })) onClose();
    } finally {
      closing.current = false;
    }
  };
  const save = async () => {
    if (pending.current || closing.current) return;
    if (target == null || !Number.isInteger(target) || target < 1 || target > max) {
      setTargetError("Informe um objetivo maior que zero" + (goalType === "PRACTICE_DAYS" ? " e até " + max : "") + ".");
      return;
    }
    pending.current = true;
    setSaving(true);
    setRequestError("");
    try {
      await onSubmit({ title: customTitle?.trim() || suggestion, description: description.trim() || undefined, type: goalType, period, target });
      onSaved();
    } catch (cause) {
      setRequestError(apiErrorMessage(cause, "Não foi possível salvar a meta. Tente novamente."));
    } finally {
      pending.current = false;
      setSaving(false);
    }
  };

  return (
    <Modal visible transparent animationType={reducedMotion ? "none" : "fade"} onRequestClose={close}>
      <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Pressable accessibilityRole="button" accessibilityLabel="Fechar" style={StyleSheet.absoluteFill} onPress={close} />
        <View accessibilityViewIsModal style={styles.editor}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Text accessibilityRole="header" style={styles.title}>Nova meta</Text>
            <Text style={styles.label}>Tipo</Text>
            <ChipGroup label="Tipo da meta" options={GOAL_TYPES} value={goalType} onChange={changeType} disabled={saving} />
            <Text style={styles.label}>Frequência</Text>
            <ChipGroup label="Frequência da meta" options={GOAL_PERIODS} value={period} onChange={changePeriod} disabled={saving} />
            <Text style={styles.label}>Objetivo</Text>
            {goalType === "PRACTICE_TIME" ? (
              <DurationInput value={target} onChange={changeTarget} shortcuts={DURATION_SHORTCUTS[period]} disabled={saving} error={targetError} />
            ) : (
              <View style={styles.block}>
                <View style={styles.stepper}>
                  <IconButton icon="remove" label="Diminuir" disabled={saving || (target ?? 1) <= 1} onPress={() => changeTarget(Math.max(1, (target ?? 1) - 1))} />
                  <Text accessibilityLabel={(goalType === "PRACTICE_DAYS" ? "Objetivo em dias: " : "Objetivo em presenças: ") + target} accessibilityLiveRegion="polite" style={styles.amount}>{target}</Text>
                  <IconButton icon="add" label="Aumentar" disabled={saving || (target ?? 1) >= max} onPress={() => changeTarget(Math.min(max, (target ?? 1) + 1))} />
                </View>
                {targetError ? <Text accessibilityLiveRegion="polite" style={styles.error}>{targetError}</Text> : null}
              </View>
            )}
            <TextField label="Título (opcional)" value={customTitle ?? suggestion} onChangeText={(value) => { setCustomTitle(value); setDirty(true); }} maxLength={255} editable={!saving} returnKeyType="done" onSubmitEditing={save} />
            <TextField label="Descrição (opcional)" value={description} onChangeText={(value) => { setDescription(value); setDirty(true); }} maxLength={255} editable={!saving} multiline />
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
  backdrop: { flex: 1, backgroundColor: colors.scrim, justifyContent: "center", padding: space.xl },
  editor: { backgroundColor: colors.surface, borderRadius: radius.lg, maxHeight: "90%" },
  content: { padding: space.xl, gap: space.md },
  title: { ...type.title },
  label: { ...type.label },
  block: { gap: space.sm },
  stepper: { flexDirection: "row", alignItems: "center", gap: space.lg },
  amount: { ...type.title, minWidth: 40, textAlign: "center" },
  error: { color: colors.danger, fontSize: 13 },
});
