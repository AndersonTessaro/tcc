import type { ReactNode } from "react";
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { brandGradient, colors, space, type } from "@/ui/theme";

const logoImage = require("@/assets/images/figma-student/login-logo.png");

type AuthSheetProps = { title: string; subtitle?: string; children: ReactNode };

export function AuthSheet({ title, subtitle, children }: AuthSheetProps) {
  return (
    <LinearGradient colors={brandGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.screen}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.screen} edges={["top"]}>
        <KeyboardAvoidingView style={styles.screen} behavior={Platform.select({ ios: "padding", default: undefined })}>
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <View style={styles.brand}>
              <Image source={logoImage} style={styles.logo} accessible={false} />
              <Text style={styles.brandName}>SONETTO</Text>
            </View>
            <View style={styles.sheet}>
              <Text accessibilityRole="header" style={styles.title}>{title}</Text>
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
              {children}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

export const authStyles = StyleSheet.create({
  form: { gap: space.md, marginTop: space.xxl },
  error: { color: colors.danger, fontSize: 14, textAlign: "center" },
  message: { ...type.body, color: colors.muted, lineHeight: 22, textAlign: "center", marginTop: space.xxl },
  fieldIcon: { width: 15, height: 15 },
  footer: { marginTop: space.lg },
});

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  brand: { flex: 1, minHeight: 180, alignItems: "center", justifyContent: "center", paddingVertical: space.xl },
  logo: { width: 72, height: 135 },
  brandName: { color: colors.onBrand, fontSize: 26, fontWeight: "500", letterSpacing: 0.5, marginTop: space.sm },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: space.xxl, paddingTop: space.xxxl, paddingBottom: space.xxxl },
  title: { ...type.title, fontWeight: "600", textAlign: "center" },
  subtitle: { ...type.body, color: colors.muted, textAlign: "center", marginTop: space.xs },
});
