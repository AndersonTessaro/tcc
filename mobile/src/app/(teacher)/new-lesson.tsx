import { useEffect, useRef, useState } from "react";
import { ScrollView, Text, TextInput, Pressable, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { teacherService, type TeacherEnrollment } from "@/features/teacher/teacherService";
import { lessonStatusLabel } from "@/features/teacher/agenda";
import { apiErrorMessage } from "@/lib/http/errorMessage";
import {
  localIsoDate,
  oneHourAfter,
  validateLessonForm,
} from "@/features/teacher/lessonForm";

const DEFAULT_START = "10:00";

export default function NewLesson() {
  const { studentId } = useLocalSearchParams<{ studentId?: string }>();
  const [enrollments, setEnrollments] = useState<TeacherEnrollment[]>([]);
  const [enrollmentId, setEnrollmentId] = useState("");
  const [date, setDate] = useState(localIsoDate());
  const [startTime, setStartTime] = useState(DEFAULT_START);
  const [endTime, setEndTime] = useState(oneHourAfter(DEFAULT_START));
  const [content, setContent] = useState("");
  const [homework, setHomework] = useState("");
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const pending = useRef(false);

  useEffect(() => {
    teacherService
      .enrollments()
      .then((items) => {
        setEnrollments(items);
        if (studentId) setEnrollmentId(items.find((item) => item.studentId === studentId)?.id ?? "");
      })
      .catch(() => setMsg("Erro ao carregar alunos"));
  }, [studentId]);

  const changeStart = (value: string) => {
    setStartTime(value);
    const suggested = oneHourAfter(value);
    if (suggested) setEndTime(suggested);
  };

  const save = async () => {
    if (pending.current) return;
    const lesson = { enrollmentId, date, startTime, endTime };
    const invalid = validateLessonForm(lesson);
    if (invalid) {
      setMsg(invalid);
      return;
    }
    setMsg("");
    pending.current = true;
    setSaving(true);
    try {
      const created = await teacherService.newLesson({
        ...lesson,
        content: content || undefined,
        homework: homework || undefined,
      });
      setMsg(`Aula registrada! ${lessonStatusLabel(created.status)}`);
      setEnrollmentId("");
      setContent("");
      setHomework("");
    } catch (error) {
      setMsg(apiErrorMessage(error, "Erro ao registrar aula"));
    } finally {
      pending.current = false;
      setSaving(false);
    }
  };

  const field = (ph: string, v: string, set: (s: string) => void) => (
    <TextInput
      className="bg-white border border-[#C9C9C9] text-[#17131A] rounded-lg px-3 py-3 mb-4"
      placeholder={ph}
      placeholderTextColor="#9A969B"
      autoCapitalize="none"
      value={v}
      onChangeText={set}
    />
  );

  return (
    <ScrollView className="flex-1 bg-[#F4F4F4]" contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 32 }}>
      <Text className="text-center text-[20px] font-bold text-[#17131A] mt-10 mb-8">Nova aula</Text>
      <Text className="text-[#17131A] font-semibold mb-2">Aluno e instrumento</Text>
      {enrollments.length === 0 ? (
        <Text className="text-[#6A666B] mb-3">Nenhuma matrícula ativa.</Text>
      ) : (
        enrollments.map((e) => {
          const selected = e.id === enrollmentId;
          return (
            <Pressable
              key={e.id}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              className={`rounded-lg border p-4 mb-2 ${selected ? "bg-[#F0EAFB] border-[#7040C5]" : "bg-white border-[#C9C9C9]"}`}
              onPress={() => setEnrollmentId(e.id)}
            >
              <Text className="text-[#17131A] font-semibold">{e.studentName}</Text>
              <Text className="text-[#6A666B]">{e.instrument}</Text>
            </Pressable>
          );
        })
      )}
      <View className="mt-4">
        <Text className="text-[#17131A] font-semibold mb-2">Data</Text>
        {field("Data (AAAA-MM-DD)", date, setDate)}
        <View className="flex-row gap-3">
          <View className="flex-1"><Text className="text-[#17131A] font-semibold mb-2">Início</Text>{field("Início (HH:MM)", startTime, changeStart)}</View>
          <View className="flex-1"><Text className="text-[#17131A] font-semibold mb-2">Fim</Text>{field("Fim (HH:MM)", endTime, setEndTime)}</View>
        </View>
        <Text className="text-[#17131A] font-semibold mb-2">Conteúdo trabalhado</Text>
        {field("Conteúdo", content, setContent)}
        <Text className="text-[#17131A] font-semibold mb-2">Tarefa para casa</Text>
        {field("Tarefa de casa", homework, setHomework)}
      </View>
      <Pressable accessibilityRole="button" disabled={saving} className="bg-[#7040C5] rounded-lg p-4 items-center mt-3" onPress={save}>
        <Text className="text-white font-semibold">Salvar aula</Text>
      </Pressable>
      {msg ? <Text className="text-[#5930A9] mt-4">{msg}</Text> : null}
    </ScrollView>
  );
}
