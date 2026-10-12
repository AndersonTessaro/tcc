import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { formatFullDate, isValidIsoDate, parseIsoDate, toIsoDate } from "@/lib/format";
import { colors, radius, space, type } from "./theme";

type Mode = "date" | "time";

export type DateTimeFieldHandle = { focus: () => void };

type DateTimeFieldProps = {
  labelStyle?: StyleProp<TextStyle>;
  fieldStyle?: StyleProp<ViewStyle>;
  mode: Mode;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string | null;
  minimumDate?: Date;
  maximumDate?: Date;
  disabled?: boolean;
};

function toDate(mode: Mode, value: string): Date {
  if (mode === "date") return isValidIsoDate(value) ? parseIsoDate(value) : new Date();
  const [hours, minutes] = (value || "08:00").split(":").map(Number);
  const date = new Date();
  date.setHours(hours || 0, minutes || 0, 0, 0);
  return date;
}

function fromDate(mode: Mode, date: Date): string {
  if (mode === "date") return toIsoDate(date);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

// The community picker has no web build; a native <input type="date|time"> keeps ISO values with a locale display.
export const DateTimeField = forwardRef<DateTimeFieldHandle, DateTimeFieldProps>(function DateTimeField({ mode, label, labelStyle, fieldStyle, value, onChange, placeholder, error, minimumDate, maximumDate, disabled }, ref) {
  const webInputRef = useRef<HTMLInputElement>(null);
  useImperativeHandle(ref, () => ({ focus: () => {
    if (disabled) return;
    if (Platform.OS === "web") webInputRef.current?.focus?.();
    else setOpen(true);
  } }));
  const [open, setOpen] = useState(false);
  const display = value ? (mode === "date" ? formatFullDate(value) : value) : "";

  if (Platform.OS === "web") {
    const flat = StyleSheet.flatten(fieldStyle);
    return (
      <View style={styles.wrapper}>
        <Text style={[styles.label, labelStyle]}>{label}</Text>
        <input
          ref={webInputRef}
          type={mode}
          disabled={disabled}
          aria-label={label}
          aria-invalid={!!error}
          value={value}
          min={mode === "date" && minimumDate ? toIsoDate(minimumDate) : undefined}
          max={mode === "date" && maximumDate ? toIsoDate(maximumDate) : undefined}
          onChange={(event) => onChange(event.currentTarget.value)}
          style={{
            minHeight: 48,
            boxSizing: "border-box",
            padding: `0 ${space.md}px`,
            borderRadius: typeof flat?.borderRadius === "number" ? flat.borderRadius : radius.md,
            border: `1px solid ${error ? colors.danger : colors.cardBorder}`,
            backgroundColor: colors.surface,
            color: colors.text,
            fontSize: 16,
            fontFamily: "inherit",
          }}
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
      <Text style={[styles.label, labelStyle]}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${display || "não definido"}`}
        accessibilityHint="Abre o seletor"
        disabled={disabled}
        aria-disabled={!!disabled}
        onPress={() => setOpen((current) => !current)}
        style={({ pressed }) => [styles.field, open && styles.focused, !!error && styles.invalid, pressed && styles.pressed, fieldStyle]}
      >
        <Ionicons name={mode === "date" ? "calendar-outline" : "time-outline"} size={18} color={colors.primary} />
        <Text style={[styles.value, !display && styles.placeholder]}>{display || placeholder || (mode === "date" ? "Escolher data" : "Escolher horário")}</Text>
      </Pressable>
      {open && !disabled ? (
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
});

const styles = StyleSheet.create({
  wrapper: { gap: 6, flex: 1 },
  label: { ...type.label },
  field: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: space.sm, paddingHorizontal: space.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.surface },
  focused: { borderColor: colors.primary, backgroundColor: colors.surface },
  invalid: { borderColor: colors.danger },
  pressed: { opacity: 0.8 },
  value: { color: colors.text, fontSize: 16 },
  placeholder: { color: colors.placeholder },
  error: { color: colors.danger, fontSize: 13 },
});
