import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import type { Resource } from "@/hooks/use-resource";
import { apiErrorMessage } from "@/lib/http/errorMessage";
import { ScreenHeader } from "@/ui/ScreenHeader";
import { ScreenState } from "@/ui/ScreenState";
import { colors, space, type } from "@/ui/theme";

type LoadState = Pick<Resource<unknown>, "loading" | "error" | "refreshing" | "refresh" | "reload">;

export function MoreScreen({ title, resource, action, children }: { title: string; resource?: LoadState; action?: ReactNode; children: ReactNode }) {
  return (
    <KeyboardAvoidingView style={moreStyles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <StatusBar style="dark" />
      <ScreenHeader title={title} back action={action} />
      <ScrollView accessibilityLabel={title} contentContainerStyle={moreStyles.content} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets
        refreshControl={resource ? <RefreshControl refreshing={resource.refreshing} onRefresh={resource.refresh} tintColor={colors.primary} colors={[colors.primary]} /> : undefined}>
        {resource?.loading ? <ScreenState loading skeleton /> : resource?.error ?
          <ScreenState message={apiErrorMessage(resource.error, "Não foi possível carregar os dados.")} retry={() => void resource.reload()} /> : children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export const moreStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screen },
  content: { paddingHorizontal: space.lg, paddingBottom: space.xxxl, gap: space.md, flexGrow: 1 },
  card: { gap: space.md },
  heading: { ...type.heading },
  body: { ...type.body },
  caption: { ...type.caption },
  amount: { ...type.display },
  row: { flexDirection: "row", alignItems: "center", gap: space.sm, flexWrap: "wrap" },
  error: { ...type.caption, color: colors.danger },
});
