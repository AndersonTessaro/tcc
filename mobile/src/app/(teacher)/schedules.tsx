import { useCallback, useEffect, useRef, useState } from "react";
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

const DEFAULT_START = "14:00";

export default function Schedules() {
  const [schedules, setSchedules] = useState<TeacherSchedule[]>([]);
  const [enrollments, setEnrollments] = useState<TeacherEnrollment[]>([]);
  const [enrollmentId, setEnrollmentId] = useState("");
  const [weekday, setWeekday] = useState<Weekday>("MONDAY");
  const [startTime, setStartTime] = useState(DEFAULT_START);
  const [endTime, setEndTime] = useState(oneHourAfter(DEFAULT_START));
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);

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
    if (pending.current) return;
    const invalid = enrollmentId ? validateTimeRange(startTime, endTime) : "Selecione o aluno";
    if (invalid) {
      setMsg(invalid);
      return;
    }
    setMsg("");
    pending.current = true;
    setBusy(true);
    try {
      await teacherService.createSchedule({ enrollmentId, weekday, startTime, endTime });
      setMsg("Horário criado!");
      load();
    } catch (error) {
      setMsg(apiErrorMessage(error, "Erro ao criar horário"));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };

  const toggle = async (schedule: TeacherSchedule) => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setMsg("");
    try {
      await teacherService.setScheduleActive(schedule.id, !schedule.active);
      load();
    } catch (error) {
      setMsg(apiErrorMessage(error, "Erro ao alterar horário"));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };

  const chip = (label: string, selected: boolean, onPress: () => void) => (
    <Pressable
      key={label}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      className={`rounded-lg border px-3 py-2 mb-2 ${selected ? "bg-[#7040C5] border-[#7040C5]" : "bg-white border-[#D5D5D5]"}`}
      onPress={onPress}
    >
      <Text className={selected ? "text-white" : "text-[#17131A]"}>{label}</Text>
    </Pressable>
  );

  return (
    <ScrollView className="flex-1 bg-[#F4F4F4]" contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 32 }}>
      <Text className="text-center text-[20px] font-bold text-[#17131A] mt-10 mb-8">Horários fixos</Text>
      {schedules.length === 0 ? <Text className="text-[#6A666B] mb-4">Nenhum horário cadastrado.</Text> : null}
      {schedules.map((s) => (
        <View key={s.id} className="bg-white border border-[#D5D5D5] rounded-lg p-4 mb-3">
          <Text className="text-[#17131A] font-semibold">
            {weekdayLabel(s.weekday)} {hhmm(s.startTime)}–{hhmm(s.endTime)} · {s.studentName}
          </Text>
          <Text className="text-[#6A666B] mb-2">
            {s.instrument} · {s.active ? "Ativo" : "Inativo"}
          </Text>
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            className="rounded-lg px-3 py-2 border border-[#7040C5] self-start"
            onPress={() => toggle(s)}
          >
            <Text className="text-[#5930A9] font-semibold">{s.active ? "Desativar" : "Reativar"}</Text>
          </Pressable>
        </View>
      ))}

      <Text className="text-lg font-bold text-[#17131A] mt-6 mb-2">Novo horário</Text>
      <Text className="text-[#17131A] font-semibold mb-2">Aluno</Text>
      <View className="flex-row flex-wrap gap-2">
        {enrollments.map((e) => chip(`${e.studentName} · ${e.instrument}`, e.id === enrollmentId, () => setEnrollmentId(e.id)))}
      </View>
      <Text className="text-[#17131A] font-semibold mb-2 mt-2">Dia da semana</Text>
      <View className="flex-row flex-wrap gap-2">
        {WEEKDAYS.map((d) => chip(d.label, d.value === weekday, () => setWeekday(d.value)))}
      </View>
      <TextInput
        className="bg-white border border-[#D5D5D5] text-[#17131A] rounded-lg p-4 my-3"
        placeholder="Início (HH:MM)"
        placeholderTextColor="#9A969B"
        value={startTime}
        onChangeText={changeStart}
      />
      <TextInput
        className="bg-white border border-[#D5D5D5] text-[#17131A] rounded-lg p-4 mb-3"
        placeholder="Fim (HH:MM)"
        placeholderTextColor="#9A969B"
        value={endTime}
        onChangeText={setEndTime}
      />
      <Pressable accessibilityRole="button" disabled={busy} className="bg-[#7040C5] rounded-lg p-4 items-center" onPress={create}>
        <Text className="text-white font-semibold">Criar horário</Text>
      </Pressable>
      {msg ? <Text className="text-[#B42318] mt-4">{msg}</Text> : null}
    </ScrollView>
  );
}
