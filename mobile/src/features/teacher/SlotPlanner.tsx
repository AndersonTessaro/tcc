import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { shortTime } from "@/lib/format";
import { apiErrorMessage } from "@/lib/http/errorMessage";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { Chip } from "@/ui/Chip";
import { colors, radius, space, type } from "@/ui/theme";
import { nextFreeStarts, partyLabel } from "./scheduling";
import type { AvailabilityBlock, LessonAvailability } from "./teacherService";

type SlotPlannerProps = {
  availability: LessonAvailability | null;
  checking: boolean;
  error: unknown;
  verified: boolean;
  startTime: string;
  durationMin: number;
  onPickStart: (start: string) => void;
  onUseSchedule: (block: AvailabilityBlock) => void;
};

const range = (block: AvailabilityBlock) => `${shortTime(block.startTime)}–${shortTime(block.endTime)}`;

export function SlotPlanner({ availability, checking, error, verified, startTime, durationMin, onPickStart, onUseSchedule }: SlotPlannerProps) {
  const busy = availability?.busy ?? [];
  const fulfilled = availability?.fulfilledSchedule ?? null;
  const usingSchedule = !!fulfilled && shortTime(fulfilled.startTime) === startTime;
  const suggestions = availability ? nextFreeStarts(busy, durationMin, null, 8) : [];

  return (
    <View style={styles.wrapper}>
      <Verdict availability={availability} checking={checking} error={error} verified={verified} />

      {fulfilled ? (
        <Card style={styles.scheduleCard}>
          <View style={styles.scheduleRow}>
            <Ionicons name="repeat" size={20} color={colors.primary} accessible={false} />
            <View style={styles.flex}>
              <Text style={styles.scheduleTitle}>Horário fixo deste aluno: {range(fulfilled)}</Text>
              <Text style={styles.caption}>Aula do mesmo professor e aluno cumpre o horário fixo, sem conflito.</Text>
            </View>
          </View>
          {!usingSchedule ? <Button label="Usar horário fixo" variant="secondary" compact onPress={() => onUseSchedule(fulfilled)} /> : null}
        </Card>
      ) : null}

      <Text accessibilityRole="header" style={styles.subheading}>Agenda do dia</Text>
      {!availability && checking ? (
        <ActivityIndicator color={colors.primary} accessibilityLabel="Carregando agenda do dia" />
      ) : busy.length ? (
        <View style={styles.list}>
          {busy.map((block) => (
            <View
              key={`${block.kind}-${block.referenceId}`}
              accessible
              accessibilityLabel={`${range(block)}, ${block.description}, ${partyLabel(block.party)}`}
              style={styles.busyRow}
            >
              <Text style={styles.busyTime}>{range(block)}</Text>
              <View style={styles.flex}>
                <Text style={styles.busyTitle}>{block.description}</Text>
                <Text style={styles.caption}>{block.kind === "RECURRING" ? "Horário fixo" : "Aula"} · {partyLabel(block.party)}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : availability ? (
        <Text style={styles.caption}>Professor e aluno estão livres o dia todo.</Text>
      ) : (
        <Text style={styles.caption}>Escolha o aluno e a data para ver a agenda.</Text>
      )}

      {suggestions.length ? (
        <>
          <Text accessibilityRole="header" style={styles.subheading}>Horários livres para {durationMin} min</Text>
          <View accessibilityRole="radiogroup" accessibilityLabel="Horários livres" style={styles.chips}>
            {suggestions.map((start) => (
              <Chip key={start} label={start} selected={start === startTime} accessibilityLabel={`Começar às ${start}`} onPress={() => onPickStart(start)} />
            ))}
          </View>
        </>
      ) : null}
    </View>
  );
}

function Verdict({ availability, checking, error, verified }: { availability: LessonAvailability | null; checking: boolean; error: unknown; verified: boolean }) {
  if (error) {
    return <Banner tone="warning" icon="cloud-offline-outline" title="Não foi possível verificar a agenda" detail={apiErrorMessage(error, "O servidor ainda valida ao salvar.")} />;
  }
  if (checking || !verified || !availability) {
    return <Banner tone="neutral" icon="time-outline" title={checking ? "Verificando agenda…" : "Escolha aluno, data e horário"} detail="O horário é checado contra as aulas e horários fixos do professor e do aluno." busy={checking} />;
  }
  if (availability.available) {
    return <Banner tone="success" icon="checkmark-circle" title="Horário livre" detail="Nenhum conflito com aulas ou horários fixos do professor e do aluno." />;
  }
  return (
    <View accessibilityLiveRegion="polite" style={[styles.banner, styles.dangerBanner]}>
      <View style={styles.bannerRow}>
        <Ionicons name="alert-circle" size={20} color={colors.danger} accessible={false} />
        <Text accessibilityRole="alert" style={[styles.bannerTitle, { color: colors.danger }]}>
          {availability.conflicts.length === 1 ? "1 conflito neste horário" : `${availability.conflicts.length} conflitos neste horário`}
        </Text>
      </View>
      {availability.conflicts.map((block) => (
        <Text key={`${block.kind}-${block.referenceId}`} style={styles.conflictItem}>
          • {range(block)} · {block.description} ({partyLabel(block.party).toLowerCase()})
        </Text>
      ))}
      <Text style={styles.caption}>Aulas canceladas não ocupam horário. Encostar no fim de outra aula é permitido.</Text>
    </View>
  );
}

const bannerTones = {
  neutral: { bg: colors.surface, fg: colors.muted },
  success: { bg: colors.successSoft, fg: colors.success },
  warning: { bg: colors.warningSoft, fg: colors.warning },
} as const;

function Banner({ tone, icon, title, detail, busy }: { tone: keyof typeof bannerTones; icon: keyof typeof Ionicons.glyphMap; title: string; detail: string; busy?: boolean }) {
  const palette = bannerTones[tone];
  return (
    <View accessibilityLiveRegion="polite" style={[styles.banner, { backgroundColor: palette.bg }]}>
      <View style={styles.bannerRow}>
        {busy ? <ActivityIndicator size="small" color={palette.fg} /> : <Ionicons name={icon} size={20} color={palette.fg} accessible={false} />}
        <Text style={[styles.bannerTitle, { color: palette.fg }]}>{title}</Text>
      </View>
      <Text style={styles.caption}>{detail}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: space.md },
  flex: { flex: 1, gap: 2 },
  banner: { borderRadius: radius.md, padding: space.md, gap: space.xs, borderWidth: 1, borderColor: colors.border },
  dangerBanner: { backgroundColor: colors.dangerSoft, borderColor: colors.danger },
  bannerRow: { flexDirection: "row", alignItems: "center", gap: space.sm },
  bannerTitle: { ...type.bodyStrong },
  conflictItem: { ...type.body, color: colors.text },
  caption: { ...type.caption },
  scheduleCard: { gap: space.md },
  scheduleRow: { flexDirection: "row", gap: space.md, alignItems: "flex-start" },
  scheduleTitle: { ...type.bodyStrong },
  subheading: { ...type.label, marginTop: space.xs },
  list: { backgroundColor: colors.surface, borderRadius: radius.md, overflow: "hidden" },
  busyRow: { flexDirection: "row", gap: space.md, paddingHorizontal: space.md, paddingVertical: space.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  busyTime: { ...type.bodyStrong, width: 96, color: colors.primary },
  busyTitle: { ...type.body },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
});
