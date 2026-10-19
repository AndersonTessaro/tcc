import { useRef, useState } from "react";
import { StyleSheet, Text } from "react-native";
import { confirm } from "@/lib/confirm";
import { apiErrorMessage } from "@/lib/http/errorMessage";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { ProgressBar } from "@/ui/ProgressBar";
import { useToast } from "@/ui/Toast";
import { colors, space, type } from "@/ui/theme";
import type { Goal } from "./goalService";
import { goalPeriodText, goalProgressText, goalStreakText } from "./goalText";

type GoalCardProps = { goal: Goal; onEnd: (id: string) => Promise<unknown>; onEnded: () => void };

export function GoalCard({ goal, onEnd, onEnded }: GoalCardProps) {
  const toast = useToast();
  const pending = useRef(false);
  const [ending, setEnding] = useState(false);
  const period = goalPeriodText(goal);
  const end = async () => {
    if (pending.current) return;
    pending.current = true;
    try {
      if (!await confirm({ title: "Encerrar meta?", message: goal.title, confirmLabel: "Encerrar", destructive: true })) return;
      setEnding(true);
      await onEnd(goal.id);
      toast.show("Meta encerrada", "success");
      onEnded();
    } catch (cause) {
      toast.show(apiErrorMessage(cause, "Não foi possível encerrar a meta. Tente novamente."), "error");
    } finally {
      pending.current = false;
      setEnding(false);
    }
  };
  return (
    <Card variant="outlined" style={styles.card}>
      <Text style={styles.title}>{goal.title}</Text>
      {goal.createdByTeacher ? <Text style={styles.caption}>Definida por {goal.createdByTeacher}</Text> : null}
      {goal.description ? <Text style={styles.description}>{goal.description}</Text> : null}
      {goal.legacy ? <Text style={styles.caption}>Meta antiga</Text> : period ? <Text style={styles.caption}>{period}</Text> : null}
      <ProgressBar value={goal.currentProgress} max={goal.target} label={"Progresso de " + goal.title} height={8} />
      <Text style={styles.progress}>{goalProgressText(goal)}</Text>
      {goal.achieved ? <Text style={styles.achieved}>Cumprida</Text> : null}
      {!goal.legacy && goal.period && goal.streak > 0 ? <Text style={styles.caption}>{goalStreakText(goal.period, goal.streak)}</Text> : null}
      {!goal.legacy && goal.status === "ACTIVE" && goal.canEnd ? (
        <Button label="Encerrar meta" variant="ghost" compact accessibilityLabel={"Encerrar meta " + goal.title} onPress={end} loading={ending} style={styles.action} />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.md },
  title: { ...type.heading },
  description: { ...type.body },
  caption: { ...type.caption },
  progress: { ...type.label, color: colors.primary },
  achieved: { ...type.label, color: colors.success },
  action: { alignSelf: "flex-start", paddingHorizontal: 0 },
});
