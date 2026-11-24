import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, type StyleProp, type ViewStyle } from "react-native";

type KeyboardScreenProps = { style?: StyleProp<ViewStyle>; children: ReactNode };

export function KeyboardScreen({ style, children }: KeyboardScreenProps) {
  return (
    <KeyboardAvoidingView style={style} behavior={Platform.OS === "web" ? undefined : "padding"}>
      {children}
    </KeyboardAvoidingView>
  );
}
