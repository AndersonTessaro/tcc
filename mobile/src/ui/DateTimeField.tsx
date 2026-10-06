import { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { formatFullDate, parseIsoDate, toIsoDate } from "@/lib/format";
import { colors, radius, space, type } from "./theme";

type Mode = "date" | "time";

type DateTimeFieldProps = {
  mode: Mode;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string | null;
  minimumDate?: Date;
  maximumDate?: Date;
};

function toDate(mode: Mode, value: string): Date {
  if (mode === "date") return value ? parseIsoDate(value) : new Date();
  const [hours, minutes] = (value || "08:00").split(":").map(Number);
  const date = new Date();
  date.setHours(hours || 0, minutes || 0, 0, 0);
  return date;
}

function fromDate(mode: Mode, date: Date): string {
  if (mode === "date") return toIsoDate(date);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

// Web has no native picker; it falls back to a typed field in the same ISO/HH:MM format.
export function DateTimeField({ mode, label, value, onChange, placeholder, error, minimumDate, maximumDate }: DateTimeFieldProps) {
  const [open, setOpen] = useState(false);
  const display = value ? (mode === "date" ? formatFullDate(value) : value) : "";

  if (Platform.OS === "web") {
    return (
      <View style={styles.wrapper}>
        <Text style={styles.label}>{label}</Text>
        <TextInput
          accessibilityLabel={label}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder ?? (mode === "date" ? "AAAA-MM-DD" : "HH:MM")}
          placeholderTextColor={colors.placeholder}
          style={[styles.field, styles.input, !!error && styles.invalid]}
        />
        {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
      </View>
    );
  }

  const handleChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === "android") setOpen(false);
    if (event.type === "set" && date) onChange(fromDate(mode, date));
  };

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${display || "não definido"}`}
        accessibilityHint="Abre o seletor"
        onPress={() => setOpen((current) => !current)}
        style={({ pressed }) => [styles.field, open && styles.focused, !!error && styles.invalid, pressed && styles.pressed]}
      >
        <Ionicons name={mode === "date" ? "calendar-outline" : "time-outline"} size={18} color={colors.primary} />
        <Text style={[styles.value, !display && styles.placeholder]}>{display || placeholder || (mode === "date" ? "Escolher data" : "Escolher horário")}</Text>
      </Pressable>
      {open ? (
        <DateTimePicker
          value={toDate(mode, value)}
          mode={mode}
          is24Hour
          locale="pt-BR"
          display={Platform.OS === "ios" ? (mode === "date" ? "inline" : "spinner") : "default"}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          minuteInterval={mode === "time" ? 5 : undefined}
          onChange={handleChange}
          accentColor={colors.primary}
        />
      ) : null}
      {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 6, flex: 1 },
  label: { ...type.label },
  field: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: space.sm, paddingHorizontal: space.md, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.field },
  input: { color: colors.text, fontSize: 16 },
  focused: { borderColor: colors.primary, backgroundColor: colors.surface },
  invalid: { borderColor: colors.danger },
  pressed: { opacity: 0.8 },
  value: { color: colors.text, fontSize: 16 },
  placeholder: { color: colors.placeholder },
  error: { color: colors.danger, fontSize: 13 },
});
