import { useEffect, useState } from "react";
import { ScrollView, Text, TextInput, Pressable } from "react-native";
import { teacherService, type TeacherEnrollment } from "@/features/teacher/teacherService";
import {
  lessonErrorMessage,
  localIsoDate,
  oneHourAfter,
  validateLessonForm,
} from "@/features/teacher/lessonForm";

const DEFAULT_START = "10:00";

export default function NewLesson() {
  const [enrollments, setEnrollments] = useState<TeacherEnrollment[]>([]);
  const [enrollmentId, setEnrollmentId] = useState("");
  const [date, setDate] = useState(localIsoDate());
  const [startTime, setStartTime] = useState(DEFAULT_START);
  const [endTime, setEndTime] = useState(oneHourAfter(DEFAULT_START));
  const [content, setContent] = useState("");
  const [homework, setHomework] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    teacherService
      .enrollments()
      .then(setEnrollments)
      .catch(() => setMsg("Erro ao carregar alunos"));
  }, []);

  const changeStart = (value: string) => {
    setStartTime(value);
    const suggested = oneHourAfter(value);
    if (suggested) setEndTime(suggested);
  };

  const save = async () => {
    const lesson = { enrollmentId, date, startTime, endTime };
    const invalid = validateLessonForm(lesson);
    if (invalid) {
      setMsg(invalid);
      return;
    }
    setMsg("");
    try {
      await teacherService.newLesson({
        ...lesson,
        content: content || undefined,
        homework: homework || undefined,
      });
      setMsg("Aula registrada!");
      setContent("");
      setHomework("");
    } catch (error) {
      setMsg(lessonErrorMessage(error));
    }
  };

  const field = (ph: string, v: string, set: (s: string) => void) => (
    <TextInput
      className="bg-white/10 text-white rounded-xl p-4 mb-3"
      placeholder={ph}
      placeholderTextColor="#9ca3af"
      autoCapitalize="none"
      value={v}
      onChangeText={set}
    />
  );

  return (
    <ScrollView className="flex-1 bg-bg p-6">
      <Text className="text-2xl font-bold text-white mb-4">Nova aula</Text>
      <Text className="text-white/70 mb-2">Aluno</Text>
      {enrollments.length === 0 ? (
        <Text className="text-white/50 mb-3">Nenhuma matrícula ativa.</Text>
      ) : (
        enrollments.map((e) => {
          const selected = e.id === enrollmentId;
          return (
            <Pressable
              key={e.id}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              className={`rounded-xl p-4 mb-2 ${selected ? "bg-primary" : "bg-white/10"}`}
              onPress={() => setEnrollmentId(e.id)}
            >
              <Text className="text-white font-semibold">{e.studentName}</Text>
              <Text className="text-white/70">{e.instrument}</Text>
            </Pressable>
          );
        })
      )}
      {field("Data (AAAA-MM-DD)", date, setDate)}
      {field("Início (HH:MM)", startTime, changeStart)}
      {field("Fim (HH:MM)", endTime, setEndTime)}
      {field("Conteúdo", content, setContent)}
      {field("Tarefa de casa", homework, setHomework)}
      <Pressable className="bg-primary rounded-xl p-4 items-center" onPress={save}>
        <Text className="text-white font-semibold">Salvar</Text>
      </Pressable>
      {msg ? <Text className="text-accent mt-4">{msg}</Text> : null}
    </ScrollView>
  );
}
