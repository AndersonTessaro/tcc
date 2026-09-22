import { useEffect, useState, useCallback } from "react";
import { View, Text, TextInput, Pressable, FlatList } from "react-native";
import { teacherService, type AttendanceStatus, type TeacherLesson } from "@/features/teacher/teacherService";
import { ATTENDANCE_OPTIONS, canRecordAttendance, hhmm, lessonStatusLabel } from "@/features/teacher/agenda";
import { localIsoDate } from "@/features/teacher/lessonForm";
import { apiErrorMessage } from "@/lib/http/errorMessage";
import { Card } from "@/ui/Card";

export default function Schedule() {
  const today = localIsoDate();
  const [date, setDate] = useState(today);
  const [lessons, setLessons] = useState<TeacherLesson[]>([]);
  const [msg, setMsg] = useState("");

  const load = useCallback(() => {
    teacherService
      .schedule(date)
      .then(setLessons)
      .catch((error) => {
        setLessons([]);
        setMsg(apiErrorMessage(error, "Erro ao carregar agenda"));
      });
  }, [date]);
  useEffect(() => {
    load();
  }, [load]);

  const mark = async (lessonId: string, status: AttendanceStatus) => {
    setMsg("");
    try {
      await teacherService.attendance(lessonId, status);
      load();
    } catch (error) {
      setMsg(apiErrorMessage(error, "Erro ao marcar frequência"));
    }
  };

  return (
    <View className="flex-1 bg-bg p-6">
      <Text className="text-2xl font-bold text-white mb-3">Agenda</Text>
      <TextInput
        className="bg-white/10 text-white rounded-xl p-4 mb-4"
        placeholder="Data (AAAA-MM-DD)"
        placeholderTextColor="#9ca3af"
        value={date}
        onChangeText={setDate}
        autoCapitalize="none"
      />
      {msg ? <Text className="text-accent mb-2">{msg}</Text> : null}
      <FlatList
        data={lessons}
        keyExtractor={(a) => a.id}
        ListEmptyComponent={<Text className="text-white/50">Sem aulas neste dia.</Text>}
        renderItem={({ item }) => (
          <Card>
            <Text className="text-white font-semibold">
              {hhmm(item.startTime)}–{hhmm(item.endTime)} · {item.studentName}
            </Text>
            <Text className="text-white/70 mb-2">
              {item.instrument} · {lessonStatusLabel(item.status)}
              {item.content ? ` · ${item.content}` : ""}
            </Text>
            {canRecordAttendance(item, today) ? (
              <View className="flex-row gap-2">
                {ATTENDANCE_OPTIONS.map((option) => {
                  const selected = item.attendance === option.status;
                  return (
                    <Pressable
                      key={option.status}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      className={`rounded-lg px-3 py-2 ${selected ? "bg-accent" : "bg-white/10"}`}
                      onPress={() => mark(item.id, option.status)}
                    >
                      <Text className="text-white">{option.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <Text className="text-white/50">
                {item.status === "CANCELED" ? "Aula cancelada" : "Frequência disponível no dia da aula"}
              </Text>
            )}
          </Card>
        )}
      />
    </View>
  );
}
