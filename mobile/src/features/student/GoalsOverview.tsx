import { useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { GoalCard } from "@/features/goals/GoalCard";
import { GoalForm } from "@/features/goals/GoalForm";
import type { GoalFilter } from "@/features/goals/goalService";
import { useResource } from "@/hooks/use-resource";
import { apiErrorMessage } from "@/lib/http/errorMessage";
import { type ChipOption } from "@/ui/Chip";
import { IconButton } from "@/ui/IconButton";
import { ScreenHeader } from "@/ui/ScreenHeader";
import { ScreenState } from "@/ui/ScreenState";
import { useToast } from "@/ui/Toast";
import { colors, space, type } from "@/ui/theme";
import { studentService } from "./studentService";

const TAB_OPTIONS: ChipOption<GoalFilter>[] = [
  { value: "ACTIVE", label: "Ativas" },
  { value: "ENDED", label: "Encerradas" },
];
const fetchActive = () => studentService.goals("ACTIVE");
const fetchEnded = () => studentService.goals("ENDED");

export default function GoalsOverview() {
  const toast = useToast();
  const [tab, setTab] = useState<GoalFilter>("ACTIVE");
  const [creating, setCreating] = useState(false);
  const active = useResource(fetchActive);
  const ended = useResource(fetchEnded);
  const current = tab === "ACTIVE" ? active : ended;

  const reload = () => {
    void active.reload();
    void ended.reload();
  };
  const handleSaved = () => {
    setCreating(false);
    toast.show("Meta criada", "success");
    reload();
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScreenHeader title="Minhas metas" back action={<IconButton icon="add" label="Nova meta" onPress={() => setCreating(true)} />} />
      <View style={styles.toolbar}>
        <View accessibilityRole="tablist" accessibilityLabel="Situação das metas" style={styles.tabs}>
          {TAB_OPTIONS.map((option) => (
            <Pressable key={option.value} accessibilityRole="tab" accessibilityLabel={option.label} aria-selected={tab === option.value} onPress={() => setTab(option.value)} style={({ pressed }) => [styles.tab, tab === option.value && styles.activeTab, pressed && styles.pressed]}>
              <Text style={[styles.tabLabel, tab === option.value && styles.activeTabLabel]}>{option.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      {current.data ? (
        <FlatList
          data={current.data}
          keyExtractor={(goal) => goal.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={current.refreshing} onRefresh={current.refresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            tab === "ACTIVE"
              ? <ScreenState icon="flag-outline" title="Nenhuma meta ativa" message="Crie uma meta para acompanhar sua evolução." action={{ label: "Criar meta", onPress: () => setCreating(true) }} />
              : <ScreenState icon="flag-outline" title="Nenhuma meta encerrada" message="Suas metas encerradas aparecem aqui." />
          }
          renderItem={({ item }) => <GoalCard goal={item} onEnd={studentService.endGoal} onEnded={reload} />}
        />
      ) : current.error ? (
        <ScreenState message={apiErrorMessage(current.error, "Não foi possível carregar suas metas.")} retry={current.reload} />
      ) : (
        <ScreenState loading skeleton />
      )}
      {creating ? <GoalForm onSubmit={studentService.createGoal} onClose={() => setCreating(false)} onSaved={handleSaved} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screen },
  toolbar: { paddingHorizontal: space.xl, paddingBottom: space.md },
  tabs: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { flex: 1, paddingVertical: space.md, alignItems: "center", borderBottomWidth: 3, borderBottomColor: "transparent" },
  activeTab: { borderBottomColor: colors.primary },
  tabLabel: { ...type.label, color: colors.muted },
  activeTabLabel: { color: colors.primary },
  pressed: { opacity: 0.7 },
  list: { flexGrow: 1, padding: space.xl, gap: space.lg },
});
