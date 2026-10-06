import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button } from "@/ui/Button";
import { Chip } from "@/ui/Chip";
import { TextField } from "@/ui/TextField";
import { space } from "@/ui/theme";
import { ATTENDANCE_OPTIONS } from "./agenda";
import type { AttendanceStatus, TeacherLesson } from "./teacherService";

type AttendanceControlProps = {
  lesson: TeacherLesson;
  busy: boolean;
  onMark: (status: AttendanceStatus, justification?: string) => Promise<boolean>;
};

export function AttendanceControl({ lesson, busy, onMark }: AttendanceControlProps) {
  const [justifying, setJustifying] = useState(false);
  const [justification, setJustification] = useState("");
  const selected = justifying ? "EXCUSED" : lesson.attendance;

  const choose = (status: AttendanceStatus) => {
    if (status === "EXCUSED") {
      setJustifying(true);
      return;
    }
    setJustifying(false);
    if (status !== lesson.attendance) void onMark(status);
  };

  const saveJustification = async () => {
    if (!(await onMark("EXCUSED", justification.trim() || undefined))) return;
    setJustifying(false);
    setJustification("");
  };

  return (
    <View style={styles.wrapper}>
      <View accessibilityRole="radiogroup" accessibilityLabel={`Frequência de ${lesson.studentName}`} style={styles.chips}>
        {ATTENDANCE_OPTIONS.map((option) => (
          <Chip key={option.status} label={option.label} selected={selected === option.status} disabled={busy} onPress={() => choose(option.status)} />
        ))}
      </View>
      {justifying ? (
        <View style={styles.justification}>
          <TextField
            label="Justificativa"
            accessibilityLabel={`Justificativa para ${lesson.studentName}`}
            placeholder="Ex.: atestado médico (opcional)"
            value={justification}
            onChangeText={setJustification}
            maxLength={255}
            editable={!busy}
          />
          <View style={styles.justificationActions}>
            <Button label="Cancelar" variant="ghost" compact onPress={() => setJustifying(false)} disabled={busy} />
            <Button label="Salvar justificativa" compact onPress={saveJustification} loading={busy} />
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: space.sm },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  justification: { gap: space.sm },
  justificationActions: { flexDirection: "row", justifyContent: "flex-end", gap: space.sm },
});
