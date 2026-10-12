import { forwardRef, useId, useState, type ReactNode } from "react";
import { Platform, StyleSheet, Text, TextInput, View, type TextInputProps, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import { colors, radius, space, type } from "./theme";

type TextFieldProps = TextInputProps & {
  label?: string;
  labelStyle?: StyleProp<TextStyle>;
  fieldStyle?: StyleProp<ViewStyle>;
  error?: string | null;
  hint?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
};

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, labelStyle, fieldStyle, error, hint, leading, trailing, style, multiline, accessibilityLabel, accessibilityHint, onFocus, onBlur, ...input },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const descriptionId = useId();
  const description = error || hint;
  return (
    <View style={styles.wrapper}>
      {label ? <Text style={[styles.label, labelStyle]}>{label}</Text> : null}
      <View style={[styles.field, multiline && styles.multiline, focused && styles.focused, !!error && styles.invalid, fieldStyle]}>
        {leading}
        <TextInput
          ref={ref}
          accessibilityLabel={accessibilityLabel ?? label}
          placeholderTextColor={colors.placeholder}
          multiline={multiline}
          textAlignVertical={multiline ? "top" : "center"}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          style={[styles.input, multiline && styles.multilineInput, style]}
          {...input}
          aria-invalid={!!error}
          aria-describedby={Platform.OS === "web" && description ? descriptionId : undefined}
          accessibilityHint={Platform.OS === "web" ? accessibilityHint : [accessibilityHint, description].filter(Boolean).join(". ") || undefined}
        />
        {trailing}
      </View>
      {error ? (
        <Text nativeID={descriptionId} accessibilityLiveRegion="polite" style={styles.error}>{error}</Text>
      ) : hint ? (
        <Text nativeID={descriptionId} style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  label: { ...type.label },
  field: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: space.sm, paddingHorizontal: space.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.surface },
  multiline: { alignItems: "flex-start", paddingVertical: space.sm },
  focused: { borderColor: colors.primary, backgroundColor: colors.surface },
  invalid: { borderColor: colors.danger },
  input: { flex: 1, color: colors.text, fontSize: 16, paddingVertical: space.sm },
  multilineInput: { minHeight: 88 },
  error: { color: colors.danger, fontSize: 13 },
  hint: { ...type.caption },
});
