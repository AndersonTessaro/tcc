import { useState } from "react";
import { ScrollView, Text, TextInput, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { teacherService } from "@/features/teacher/teacherService";
import { localIsoDate, oneHourAfter, validateDate, validateTimeRange } from "@/features/teacher/lessonForm";
import { apiErrorMessage } from "@/lib/http/errorMessage";

const DEFAULT_START = "10:00";

export default function Makeup() {
  const { lessonId } = useLocalSearchParams<{ lessonId?: string }>();
  const router = useRouter();
  const [date, setDate] = useState(localIsoDate());
  const [startTime, setStartTime] = useState(DEFAULT_START);
  const [endTime, setEndTime] = useState(oneHourAfter(DEFAULT_START));
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState("");

  const changeStart = (value: string) => {
    setStartTime(value);
    const suggested = oneHourAfter(value);
    if (suggested) setEndTime(suggested);
  };

  const save = async () => {
    if (!lessonId) {
      setMsg("Aula não informada");
      return;
    }
    const invalid = validateDate(date) ?? validateTimeRange(startTime, endTime);
    if (invalid) {
      setMsg(invalid);
      return;
    }
    setMsg("");
    try {
      await teacherService.makeup(lessonId, { date, startTime, endTime, reason: reason || undefined });
      setMsg("Reposição agendada!");
      router.back();
    } catch (error) {
      setMsg(apiErrorMessage(error, "Erro ao agendar reposição"));
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
      <Text className="text-2xl font-bold text-white mb-4">Reposição</Text>
      {field("Data (AAAA-MM-DD)", date, setDate)}
      {field("Início (HH:MM)", startTime, changeStart)}
      {field("Fim (HH:MM)", endTime, setEndTime)}
      {field("Motivo", reason, setReason)}
      <Pressable className="bg-primary rounded-xl p-4 items-center" onPress={save}>
        <Text className="text-white font-semibold">Agendar reposição</Text>
      </Pressable>
      {msg ? <Text className="text-accent mt-4">{msg}</Text> : null}
    </ScrollView>
  );
}
