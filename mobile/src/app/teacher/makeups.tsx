import { useState } from "react";
import { Text } from "react-native";
import { teacherService } from "@/features/teacher/teacherService";
import { MoreScreen, moreStyles as styles } from "@/features/teacher/more/MoreScreen";
import { useResource } from "@/hooks/use-resource";
import { addDays, formatDayMonth, shortTime, todayIso } from "@/lib/format";
import { Card } from "@/ui/Card";
import { ChipGroup } from "@/ui/Chip";
import { ScreenState } from "@/ui/ScreenState";
import { StatusChip } from "@/ui/StatusChip";

const statuses = { SCHEDULED: "Agendada", DONE: "Concluída", CANCELED: "Cancelada" } as const;

export default function Makeups() {
  const [period, setPeriod] = useState<"upcoming" | "past">("upcoming");
  const today = todayIso();
  const makeups = useResource(() => period === "upcoming"
    ? teacherService.makeups(today, addDays(today, 60))
    : teacherService.makeups(addDays(today, -30), addDays(today, -1)), period);
  return (
    <MoreScreen title="Reposições" resource={makeups}>
      <ChipGroup label="Período de reposições" value={period} onChange={setPeriod}
        options={[{ value: "upcoming", label: "Próximas" }, { value: "past", label: "Passadas" }]} />
      {makeups.data?.map((item) => (
        <Card key={item.id} style={styles.card}>
          <Text style={styles.heading}>{item.studentName}</Text>
          <Text style={styles.caption}>{item.instrument}</Text>
          <Text style={styles.body}>Original: {formatDayMonth(item.original.date)} {shortTime(item.original.startTime)} → Reposição: {formatDayMonth(item.makeup.date)} {shortTime(item.makeup.startTime)}</Text>
          {item.reason ? <Text style={styles.body}>{item.reason}</Text> : null}
          <StatusChip label={statuses[item.makeup.status]} tone={item.makeup.status === "DONE" ? "success" : item.makeup.status === "CANCELED" ? "danger" : "neutral"} />
        </Card>
      ))}
      {makeups.data?.length === 0 ? <ScreenState icon="repeat" title="Nenhuma reposição" message="Crie pela Agenda → Repor" /> : null}
    </MoreScreen>
  );
}
