import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { teacherService, type AttendanceStatus, type LessonStatus, type TeacherLesson } from "@/features/teacher/teacherService";
import { ATTENDANCE_OPTIONS, canRecordAttendance, hhmm, lessonActions, lessonStatusLabel } from "@/features/teacher/agenda";
import { localIsoDate, validateDate } from "@/features/teacher/lessonForm";
import { apiErrorMessage } from "@/lib/http/errorMessage";
import { ScreenHeader } from "@/ui/ScreenHeader";

const weekDays = ["D", "S", "T", "Q", "Q", "S", "S"];

function monthDays(value: string) {
  const [year, month] = value.split("-").map(Number);
  const first = new Date(year, month - 1, 1).getDay();
  const length = new Date(year, month, 0).getDate();
  return Array.from({ length: Math.ceil((first + length) / 7) * 7 }, (_, index) => {
    const day = index - first + 1;
    return day > 0 && day <= length ? day : null;
  });
}

export default function Schedule() {
  const router = useRouter();
  const today = localIsoDate();
  const params = useLocalSearchParams<{ date?: string }>();
  const initialDate = params.date && !validateDate(params.date) ? params.date : today;
  const [date, setDate] = useState(initialDate);
  const [dateInput, setDateInput] = useState(initialDate);
  useEffect(() => {
    if (params.date && !validateDate(params.date)) { setDate(params.date); setDateInput(params.date); }
  }, [params.date]);
  const [lessons, setLessons] = useState<TeacherLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [justifications, setJustifications] = useState<Record<string, string>>({});
  const [busyLessonId, setBusyLessonId] = useState<string | null>(null);
  const pendingLessonId = useRef<string | null>(null);
  const requestId = useRef(0);

  const load = useCallback(() => {
    const currentRequest = ++requestId.current;
    setLoading(true);
    setMsg("");
    teacherService.schedule(date)
      .then((result) => { if (currentRequest === requestId.current) setLessons(result); })
      .catch((error) => {
        if (currentRequest !== requestId.current) return;
        setLessons([]);
        setMsg(apiErrorMessage(error, "Erro ao carregar agenda"));
      })
      .finally(() => { if (currentRequest === requestId.current) setLoading(false); });
  }, [date]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const searchDate = () => {
    const invalid = validateDate(dateInput);
    if (invalid) { setMsg(invalid); return; }
    if (dateInput === date) load();
    else setDate(dateInput);
  };

  const selectDay = (day: number) => {
    const next = date.slice(0, 8) + String(day).padStart(2, "0");
    setDateInput(next);
    if (next === date) load();
    else setDate(next);
  };

  const changeMonth = (offset: number) => {
    const [year, month] = date.split("-").map(Number);
    const next = localIsoDate(new Date(year, month - 1 + offset, 1));
    setDateInput(next);
    setDate(next);
  };

  const mark = async (lessonId: string, status: AttendanceStatus) => {
    if (pendingLessonId.current) return;
    pendingLessonId.current = lessonId;
    setBusyLessonId(lessonId);
    setMsg("");
    try {
      const justification = justifications[lessonId]?.trim();
      if (justification) await teacherService.attendance(lessonId, status, justification);
      else await teacherService.attendance(lessonId, status);
      load();
    } catch (error) {
      setMsg(apiErrorMessage(error, "Erro ao marcar frequência"));
    } finally {
      pendingLessonId.current = null;
      setBusyLessonId(null);
    }
  };

  const changeStatus = async (lessonId: string, status: LessonStatus) => {
    if (pendingLessonId.current) return;
    pendingLessonId.current = lessonId;
    setBusyLessonId(lessonId);
    setMsg("");
    try {
      await teacherService.changeLessonStatus(lessonId, status);
      load();
    } catch (error) {
      setMsg(apiErrorMessage(error, "Erro ao alterar a aula"));
    } finally {
      pendingLessonId.current = null;
      setBusyLessonId(null);
    }
  };

  const actionButton = (label: string, onPress: () => void, disabled: boolean) => (
    <Pressable key={label} accessibilityRole="button" disabled={disabled} className="rounded-lg px-3 py-2 border border-[#7040C5]" onPress={onPress}>
      <Text className="text-[#5930A9] font-semibold">{label}</Text>
    </Pressable>
  );

  const [year, month] = date.split("-").map(Number);
  const monthLabel = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(year, month - 1, 1));

  return (
    <View className="flex-1 bg-[#F4F4F4]">
      <FlatList
        data={loading ? [] : lessons}
        keyExtractor={(lesson) => lesson.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 28, flexGrow: 1 }}
        ListHeaderComponent={
          <View>
            <View style={{ marginHorizontal: -18 }}><ScreenHeader title="Agenda" /></View>
            <Pressable accessibilityRole="button" className="bg-[#7040C5] rounded-lg p-3 items-center mb-4" onPress={() => router.push("/(teacher)/new-lesson")}>
              <Text className="text-white font-semibold">Nova aula</Text>
            </Pressable>
            <View className="bg-white border border-[#D5D5D5] rounded-lg px-3 pt-3 pb-4 mb-4">
              <View className="flex-row items-center justify-between mb-3">
                <Pressable accessibilityRole="button" accessibilityLabel="Mês anterior" onPress={() => changeMonth(-1)} className="px-3 py-1"><Text className="text-[#7040C5] text-xl">‹</Text></Pressable>
                <Text className="text-[#17131A] font-semibold capitalize">{monthLabel}</Text>
                <Pressable accessibilityRole="button" accessibilityLabel="Próximo mês" onPress={() => changeMonth(1)} className="px-3 py-1"><Text className="text-[#7040C5] text-xl">›</Text></Pressable>
              </View>
              <View className="flex-row flex-wrap">
                {weekDays.map((label, index) => <View key={"week-" + index} style={{ width: "14.285%" }} className="items-center py-1"><Text className="text-[#9A969B] text-xs">{label}</Text></View>)}
                {monthDays(date).map((day, index) => (
                  <View key={"day-" + index} style={{ width: "14.285%" }} className="items-center py-1">
                    {day ? <Pressable accessibilityRole="button" accessibilityLabel={"Dia " + day} onPress={() => selectDay(day)} className={"w-8 h-8 items-center justify-center rounded-md " + (Number(date.slice(8)) === day ? "bg-[#7040C5]" : "")}>
                      <Text className={Number(date.slice(8)) === day ? "text-white" : "text-[#616161]"}>{day}</Text>
                    </Pressable> : null}
                  </View>
                ))}
              </View>
            </View>
            <View className="flex-row gap-2 mb-4">
              <TextInput accessibilityLabel="Data da agenda" className="flex-1 bg-white border border-[#D5D5D5] text-[#17131A] rounded-lg px-3" placeholder="Data (AAAA-MM-DD)" placeholderTextColor="#9A969B" value={dateInput} onChangeText={setDateInput} autoCapitalize="none" />
              <Pressable accessibilityRole="button" className="bg-[#7040C5] rounded-lg px-4 justify-center" onPress={searchDate}><Text className="text-white font-semibold">Buscar dia</Text></Pressable>
            </View>
            {msg ? <Text className="text-[#B42318] mb-3">{msg}</Text> : null}
            {loading ? <ActivityIndicator color="#7040C5" className="mb-4" /> : null}
          </View>
        }
        ListEmptyComponent={loading ? null : <Text className="text-[#6A666B] text-center py-8">Sem aulas neste dia.</Text>}
        renderItem={({ item }) => (
          <View testID={`lesson-${item.id}`} className="bg-white border border-[#D5D5D5] rounded-lg p-4 mb-3">
            <Text className="text-[#17131A] font-bold">{hhmm(item.startTime)}–{hhmm(item.endTime)} · {item.studentName}</Text>
            <Text className="text-[#6A666B] mt-1 mb-2">{item.instrument} · {lessonStatusLabel(item.status)}{item.content ? " · " + item.content : ""}</Text>
            {item.homework ? <Text className="text-[#6A666B] mb-2">Tarefa: {item.homework}</Text> : null}
            {canRecordAttendance(item, today) ? (
              <View>
                <View className="flex-row flex-wrap gap-2">
                  {ATTENDANCE_OPTIONS.map((option) => {
                    const selected = item.attendance === option.status;
                    return <Pressable key={option.status} accessibilityRole="radio" accessibilityState={{ selected }} disabled={busyLessonId === item.id} className={"rounded-lg px-3 py-2 border " + (selected ? "bg-[#7040C5] border-[#7040C5]" : "bg-white border-[#D5D5D5]")} onPress={() => mark(item.id, option.status)}><Text className={selected ? "text-white" : "text-[#17131A]"}>{option.label}</Text></Pressable>;
                  })}
                </View>
                <TextInput accessibilityLabel={"Justificativa para " + item.studentName} className="bg-white border border-[#D5D5D5] text-[#17131A] rounded-lg px-3 py-2 mt-2" placeholder="Justificativa (opcional)" placeholderTextColor="#9A969B" value={justifications[item.id] ?? ""} onChangeText={(value) => setJustifications((current) => ({ ...current, [item.id]: value }))} />
              </View>
            ) : <Text className="text-[#6A666B]">{item.status === "CANCELED" ? "Aula cancelada" : "Frequência disponível no dia da aula"}</Text>}
            <View className="flex-row flex-wrap gap-2 mt-3">
              {lessonActions(item, today).canComplete ? actionButton("Concluir", () => changeStatus(item.id, "DONE"), busyLessonId === item.id) : null}
              {lessonActions(item, today).canCancel ? actionButton("Cancelar aula", () => changeStatus(item.id, "CANCELED"), busyLessonId === item.id) : null}
              {lessonActions(item, today).canReplace ? actionButton("Repor", () => router.push(`/(teacher)/makeup/${item.id}`), busyLessonId === item.id) : null}
            </View>
          </View>
        )}
      />
    </View>
  );
}
