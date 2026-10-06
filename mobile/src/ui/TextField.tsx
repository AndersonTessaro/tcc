import { forwardRef, useState, type ReactNode } from "react";
import { StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import { colors, radius, space, type } from "./theme";

type TextFieldProps = TextInputProps & {
  label?: string;
  error?: string | null;
  hint?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
};

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, error, hint, leading, trailing, style, multiline, accessibilityLabel, onFocus, onBlur, ...input },
  ref,
) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.field, multiline && styles.multiline, focused && styles.focused, !!error && styles.invalid]}>
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
        />
        {trailing}
      </View>
      {error ? (
        <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  label: { ...type.label },
  field: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: space.sm, paddingHorizontal: space.md, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.field },
  multiline: { alignItems: "flex-start", paddingVertical: space.sm },
  focused: { borderColor: colors.primary, backgroundColor: colors.surface },
  invalid: { borderColor: colors.danger },
  input: { flex: 1, color: colors.text, fontSize: 16, paddingVertical: space.sm },
  multilineInput: { minHeight: 88 },
  error: { color: colors.danger, fontSize: 13 },
  hint: { ...type.caption },
});
