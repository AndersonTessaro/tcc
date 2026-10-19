import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { formatMinutes } from "@/lib/format";
import { ChipGroup } from "./Chip";
import { TextField } from "./TextField";
import { colors, space } from "./theme";

type DurationInputProps = {
  value: number | null;
  onChange: (minutes: number | null) => void;
  shortcuts: number[];
  disabled?: boolean;
  error?: string;
};

function totalMinutes(hours: string, minutes: string): number | null {
  if ((!hours && !minutes) || !/^\d*$/.test(hours) || !/^\d*$/.test(minutes)) return null;
  const total = Number(hours) * 60 + Number(minutes);
  return Number(minutes) <= 59 && Number.isSafeInteger(total) && total <= 2147483647 ? total : null;
}

export function DurationInput({ value, onChange, shortcuts, disabled, error }: DurationInputProps) {
  const [hours, setHours] = useState(value == null ? "" : String(Math.floor(value / 60)));
  const [minutes, setMinutes] = useState(value == null ? "" : String(value % 60));
  const emitted = useRef(value);
  useEffect(() => {
    if (value === emitted.current) return;
    emitted.current = value;
    setHours(value == null ? "" : String(Math.floor(value / 60)));
    setMinutes(value == null ? "" : String(value % 60));
  }, [value]);
  const change = (nextHours: string, nextMinutes: string) => {
    setHours(nextHours);
    setMinutes(nextMinutes);
    emitted.current = totalMinutes(nextHours, nextMinutes);
    onChange(emitted.current);
  };
  const invalidMinutes = !/^\d*$/.test(minutes) || Number(minutes) > 59;
  return (
    <View style={styles.container}>
      <View style={styles.fields}>
        <View style={styles.field}><TextField label="Horas" value={hours} onChangeText={(text) => change(text, minutes)} keyboardType="number-pad" editable={!disabled} /></View>
        <View style={styles.field}><TextField label="Minutos" value={minutes} onChangeText={(text) => change(hours, text)} keyboardType="number-pad" editable={!disabled} error={invalidMinutes ? "Informe de 0 a 59 minutos." : undefined} /></View>
      </View>
      <ChipGroup label="Duração rápida" options={shortcuts.map((amount) => ({ value: String(amount), label: formatMinutes(amount).replace(/h/g, " h").replace(/min/g, " min") }))} value={value == null ? null : String(value)} disabled={disabled} onChange={(amount) => change(String(Math.floor(Number(amount) / 60)), String(Number(amount) % 60))} />
      {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: space.sm },
  fields: { flexDirection: "row", gap: space.md },
  field: { flex: 1 },
  error: { color: colors.danger, fontSize: 13 },
});
