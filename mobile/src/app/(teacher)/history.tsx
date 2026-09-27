import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { teacherService, type TeacherLesson } from "@/features/teacher/teacherService";
import { hhmm, lessonStatusLabel } from "@/features/teacher/agenda";
import { localIsoDate, validateDate } from "@/features/teacher/lessonForm";
import { apiErrorMessage } from "@/lib/http/errorMessage";

function initialStart() {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return localIsoDate(date);
}

export default function History() {
  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(localIsoDate);
  const [range, setRange] = useState({ start, end });
  const [lessons, setLessons] = useState<TeacherLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const requestId = useRef(0);

  const load = useCallback(() => {
    const currentRequest = ++requestId.current;
    setLoading(true);
    setMessage("");
    teacherService.history(range.start, range.end)
      .then((result) => {
        if (currentRequest === requestId.current) setLessons(result);
      })
      .catch((error) => {
        if (currentRequest !== requestId.current) return;
        setLessons([]);
        setMessage(apiErrorMessage(error, "Erro ao carregar histórico"));
      })
      .finally(() => {
        if (currentRequest === requestId.current) setLoading(false);
      });
  }, [range]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filter = () => {
    if (validateDate(start) || validateDate(end) || start > end) {
      setMessage("Informe um período válido, com início até o fim");
      return;
    }
    if (range.start === start && range.end === end) load();
    else setRange({ start, end });
  };

  return (
    <View className="flex-1 bg-[#F4F4F4] px-[18px]">
      <Text className="text-center text-[20px] font-bold text-[#17131A] mt-10 mb-8">Histórico de aulas</Text>
      <Text className="text-[#17131A] font-semibold mb-2">Período</Text>
      <View className="flex-row gap-2 mb-3">
        <TextInput
          accessibilityLabel="Data inicial"
          className="flex-1 bg-white border border-[#D5D5D5] text-[#17131A] rounded-lg p-3"
          placeholder="Início (AAAA-MM-DD)"
          placeholderTextColor="#9A969B"
          value={start}
          onChangeText={setStart}
        />
        <TextInput
          accessibilityLabel="Data final"
          className="flex-1 bg-white border border-[#D5D5D5] text-[#17131A] rounded-lg p-3"
          placeholder="Fim (AAAA-MM-DD)"
          placeholderTextColor="#9A969B"
          value={end}
          onChangeText={setEnd}
        />
      </View>
      <Pressable accessibilityRole="button" className="bg-[#7040C5] rounded-lg p-3 items-center mb-4" onPress={filter}>
        <Text className="text-white font-semibold">Buscar aulas</Text>
      </Pressable>
      {message ? <Text className="text-[#B42318] mb-3">{message}</Text> : null}
      {loading ? <ActivityIndicator color="#7040C5" /> : (
        <FlatList
          data={lessons}
          keyExtractor={(lesson) => lesson.id}
          ListEmptyComponent={<Text className="text-[#6A666B] text-center py-8">Nenhuma aula neste período.</Text>}
          renderItem={({ item }) => (
            <View className="bg-white border border-[#D5D5D5] rounded-lg p-4 mb-3">
              <Text className="text-[#17131A] font-semibold">
                {item.date.split("-").reverse().join("/")} · {hhmm(item.startTime)}–{hhmm(item.endTime)}
              </Text>
              <Text className="text-[#17131A] mt-1">{item.studentName} · {item.instrument}</Text>
              <Text className="text-[#6A666B] mt-1">{lessonStatusLabel(item.status)}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}
