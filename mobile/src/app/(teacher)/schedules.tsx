import { useCallback, useEffect, useState } from "react";
import { ScrollView, Text, TextInput, Pressable, View } from "react-native";
import {
  teacherService,
  type TeacherEnrollment,
  type TeacherSchedule,
  type Weekday,
} from "@/features/teacher/teacherService";
import { hhmm } from "@/features/teacher/agenda";
import { oneHourAfter, validateTimeRange } from "@/features/teacher/lessonForm";
import { WEEKDAYS, weekdayLabel } from "@/features/teacher/weeklySchedule";
import { apiErrorMessage } from "@/lib/http/errorMessage";
import { Card } from "@/ui/Card";

const DEFAULT_START = "14:00";

export default function Schedules() {
  const [schedules, setSchedules] = useState<TeacherSchedule[]>([]);
  const [enrollments, setEnrollments] = useState<TeacherEnrollment[]>([]);
  const [enrollmentId, setEnrollmentId] = useState("");
  const [weekday, setWeekday] = useState<Weekday>("MONDAY");
  const [startTime, setStartTime] = useState(DEFAULT_START);
  const [endTime, setEndTime] = useState(oneHourAfter(DEFAULT_START));
  const [msg, setMsg] = useState("");

  const load = useCallback(() => {
    teacherService
      .schedules()
      .then(setSchedules)
      .catch((error) => setMsg(apiErrorMessage(error, "Erro ao carregar horários")));
  }, []);

  useEffect(() => {
    load();
    teacherService
      .enrollments()
      .then(setEnrollments)
      .catch((error) => setMsg(apiErrorMessage(error, "Erro ao carregar alunos")));
  }, [load]);

  const changeStart = (value: string) => {
    setStartTime(value);
    const suggested = oneHourAfter(value);
    if (suggested) setEndTime(suggested);
  };

  const create = async () => {
    const invalid = enrollmentId ? validateTimeRange(startTime, endTime) : "Selecione o aluno";
    if (invalid) {
      setMsg(invalid);
      return;
    }
    setMsg("");
    try {
      await teacherService.createSchedule({ enrollmentId, weekday, startTime, endTime });
      setMsg("Horário criado!");
      load();
    } catch (error) {
      setMsg(apiErrorMessage(error, "Erro ao criar horário"));
    }
  };

  const toggle = async (schedule: TeacherSchedule) => {
    setMsg("");
    try {
      await teacherService.setScheduleActive(schedule.id, !schedule.active);
      load();
    } catch (error) {
      setMsg(apiErrorMessage(error, "Erro ao alterar horário"));
    }
  };

  const chip = (label: string, selected: boolean, onPress: () => void) => (
    <Pressable
      key={label}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      className={`rounded-lg px-3 py-2 mb-2 ${selected ? "bg-primary" : "bg-white/10"}`}
      onPress={onPress}
    >
      <Text className="text-white">{label}</Text>
    </Pressable>
  );

  return (
    <ScrollView className="flex-1 bg-bg p-6">
      <Text className="text-2xl font-bold text-white mb-4">Horários fixos</Text>
      {schedules.length === 0 ? <Text className="text-white/50 mb-4">Nenhum horário cadastrado.</Text> : null}
      {schedules.map((s) => (
        <Card key={s.id}>
          <Text className="text-white font-semibold">
            {weekdayLabel(s.weekday)} {hhmm(s.startTime)}–{hhmm(s.endTime)} · {s.studentName}
          </Text>
          <Text className="text-white/70 mb-2">
            {s.instrument} · {s.active ? "Ativo" : "Inativo"}
          </Text>
          <Pressable
            accessibilityRole="button"
            className="rounded-lg px-3 py-2 bg-white/10 self-start"
            onPress={() => toggle(s)}
          >
            <Text className="text-white">{s.active ? "Desativar" : "Reativar"}</Text>
          </Pressable>
        </Card>
      ))}

      <Text className="text-xl font-bold text-white mt-6 mb-2">Novo horário</Text>
      <Text className="text-white/70 mb-2">Aluno</Text>
      <View className="flex-row flex-wrap gap-2">
        {enrollments.map((e) => chip(`${e.studentName} · ${e.instrument}`, e.id === enrollmentId, () => setEnrollmentId(e.id)))}
      </View>
      <Text className="text-white/70 mb-2 mt-2">Dia da semana</Text>
      <View className="flex-row flex-wrap gap-2">
        {WEEKDAYS.map((d) => chip(d.label, d.value === weekday, () => setWeekday(d.value)))}
      </View>
      <TextInput
        className="bg-white/10 text-white rounded-xl p-4 my-3"
        placeholder="Início (HH:MM)"
        placeholderTextColor="#9ca3af"
        value={startTime}
        onChangeText={changeStart}
      />
      <TextInput
        className="bg-white/10 text-white rounded-xl p-4 mb-3"
        placeholder="Fim (HH:MM)"
        placeholderTextColor="#9ca3af"
        value={endTime}
        onChangeText={setEndTime}
      />
      <Pressable className="bg-primary rounded-xl p-4 items-center" onPress={create}>
        <Text className="text-white font-semibold">Criar horário</Text>
      </Pressable>
      {msg ? <Text className="text-accent mt-4">{msg}</Text> : null}
    </ScrollView>
  );
}
