import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { normalizeSearch } from "@/lib/format";
import { haptics } from "@/lib/haptics";
import { Button } from "@/ui/Button";
import { IconButton } from "@/ui/IconButton";
import { TextField } from "@/ui/TextField";
import { colors, MIN_TOUCH, radius, space, type } from "@/ui/theme";
import type { TeacherEnrollment } from "./teacherService";

type EnrollmentPickerProps = {
  enrollments: TeacherEnrollment[];
  value: string;
  onChange: (enrollmentId: string) => void;
  error?: string | null;
  initialQuery?: string;
  disabled?: boolean;
};

export const enrollmentLabel = (enrollment: TeacherEnrollment) => `${enrollment.studentName} · ${enrollment.instrument}`;

export function EnrollmentPicker({ enrollments, value, onChange, error, initialQuery = "", disabled }: EnrollmentPickerProps) {
  const [query, setQuery] = useState(initialQuery);
  const [expanded, setExpanded] = useState(false);
  const selected = enrollments.find((item) => item.id === value);
  const filtered = useMemo(() => {
    const term = normalizeSearch(query);
    return term ? enrollments.filter((item) => normalizeSearch(enrollmentLabel(item)).includes(term)) : enrollments;
  }, [enrollments, query]);

  if (!enrollments.length) {
    return <Text style={styles.empty}>Nenhuma matrícula ativa. Peça à administração para vincular alunos.</Text>;
  }

  if (selected && !expanded) {
    return (
      <View style={styles.wrapper}>
        <Option label={enrollmentLabel(selected)} selected onPress={() => setExpanded(true)} disabled={disabled} />
        <Button label="Trocar aluno" variant="ghost" compact icon="swap-horizontal" onPress={() => setExpanded(true)} disabled={disabled} style={styles.change} />
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <TextField
        accessibilityLabel="Buscar aluno ou instrumento"
        placeholder="Buscar aluno ou instrumento"
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
        leading={<Ionicons name="search" size={18} color={colors.muted} />}
        trailing={query ? <IconButton icon="close-circle" label="Limpar busca" size={20} color={colors.muted} onPress={() => setQuery("")} /> : null}
        error={error}
      />
      <View accessibilityRole="radiogroup" accessibilityLabel="Aluno e instrumento" style={styles.list}>
        {filtered.length ? filtered.map((item) => (
          <Option
            key={item.id}
            label={enrollmentLabel(item)}
            selected={item.id === value}
            disabled={disabled}
            onPress={() => {
              onChange(item.id);
              setExpanded(false);
            }}
          />
        )) : <Text style={styles.empty}>Nenhum aluno encontrado.</Text>}
      </View>
    </View>
  );
}

function Option({ label, selected, onPress, disabled }: { label: string; selected: boolean; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ selected, checked: selected, disabled: !!disabled }}
      disabled={disabled}
      onPress={() => {
        haptics.select();
        onPress();
      }}
      style={({ pressed }) => [styles.option, selected && styles.optionSelected, pressed && styles.pressed]}
    >
      <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>{label}</Text>
      {selected ? <Ionicons name="checkmark-circle" size={22} color={colors.primary} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: space.sm },
  list: { gap: space.sm },
  option: { minHeight: MIN_TOUCH + 4, flexDirection: "row", alignItems: "center", gap: space.sm, paddingHorizontal: space.lg, paddingVertical: space.md, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
  optionSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  optionLabel: { ...type.body, flex: 1 },
  optionLabelSelected: { ...type.bodyStrong, color: colors.primary },
  pressed: { opacity: 0.85 },
  change: { alignSelf: "flex-start" },
  empty: { ...type.caption, paddingVertical: space.sm },
});
