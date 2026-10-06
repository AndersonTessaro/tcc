import { useEffect } from "react";
import { AccessibilityInfo, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { haptics } from "@/lib/haptics";
import { Button } from "@/ui/Button";
import { colors, radius, space, type } from "@/ui/theme";
import { dayCount, type PracticeReward } from "./reward";

type PracticeRewardViewProps = { reward: PracticeReward; onDone: () => void };

export function rewardAnnouncement(reward: PracticeReward): string {
  return [
    "Prática registrada.",
    reward.xpGained != null ? `Mais ${reward.xpGained} XP.` : `${reward.xpTotal} XP no total.`,
    reward.leveledUp ? `Subiu para o nível ${reward.level}!` : "",
    `Sequência: ${dayCount(reward.streakDays)}.`,
  ].filter(Boolean).join(" ");
}

export function PracticeRewardView({ reward, onDone }: PracticeRewardViewProps) {
  useEffect(() => {
    haptics.success();
    AccessibilityInfo.announceForAccessibility(rewardAnnouncement(reward));
  }, [reward]);

  return (
    <View style={styles.container}>
      <View style={styles.badge}>
        <Ionicons name={reward.leveledUp ? "trophy" : "checkmark-circle"} size={56} color={colors.primary} />
      </View>
      <Text accessibilityRole="header" style={styles.title}>Prática registrada!</Text>
      <Text style={styles.xp}>{reward.xpGained != null ? `+${reward.xpGained} XP` : `${reward.xpTotal} XP`}</Text>
      {reward.leveledUp ? <Text style={styles.levelUp}>Subiu para o nível {reward.level}!</Text> : <Text style={styles.caption}>Nível {reward.level}</Text>}
      <View style={styles.streak}>
        <Ionicons name="flame" size={20} color={colors.streak} />
        <Text style={styles.streakText}>Sequência: {dayCount(reward.streakDays)}</Text>
      </View>
      <Button label="Concluir" onPress={onDone} style={styles.done} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, alignItems: "center", justifyContent: "center", padding: space.xxl, gap: space.md },
  badge: { width: 104, height: 104, borderRadius: radius.pill, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center", marginBottom: space.sm },
  title: { ...type.title, textAlign: "center" },
  xp: { fontSize: 40, fontWeight: "800", color: colors.primary },
  levelUp: { ...type.heading, color: colors.success, textAlign: "center" },
  caption: { ...type.caption },
  streak: { flexDirection: "row", alignItems: "center", gap: space.sm, backgroundColor: colors.surface, borderRadius: radius.pill, paddingHorizontal: space.lg, paddingVertical: space.sm },
  streakText: { ...type.bodyStrong },
  done: { alignSelf: "stretch", marginTop: space.xl },
});
