import { useEffect, useRef, useState } from "react";
import { ScrollView, Text, TextInput, Pressable, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { teacherService } from "@/features/teacher/teacherService";
import { localIsoDate, oneHourAfter, validateDate, validateTimeRange } from "@/features/teacher/lessonForm";
import { apiErrorMessage } from "@/lib/http/errorMessage";
import { ScreenHeader } from "@/ui/ScreenHeader";

const DEFAULT_START = "10:00";

export default function Makeup() {
  const { lessonId } = useLocalSearchParams<{ lessonId?: string }>();
  const router = useRouter();
  const [date, setDate] = useState(localIsoDate());
  const [startTime, setStartTime] = useState(DEFAULT_START);
  const [endTime, setEndTime] = useState(oneHourAfter(DEFAULT_START));
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const pending = useRef(false);
  const [checking, setChecking] = useState(true);
  const [lookupError, setLookupError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setChecking(true); setLookupError(false);
    if (!lessonId) { setChecking(false); return; }
    teacherService.makeupLink(lessonId).then((link) => {
      if (!active || !link) return;
      setDate(link.newLesson.date); setStartTime(link.newLesson.startTime.slice(0, 5)); setEndTime(link.newLesson.endTime.slice(0, 5));
      setReason(link.reason ?? ""); setSaved(true);
      setMsg(`Esta aula já tem uma reposição em ${link.newLesson.date} às ${link.newLesson.startTime.slice(0, 5)}.`);
    }).catch((cause) => { if (active) { setLookupError(true); setMsg(apiErrorMessage(cause, "Não foi possível consultar a reposição.")); } })
      .finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, [lessonId, retry]);

  const changeStart = (value: string) => {
    setStartTime(value);
    const suggested = oneHourAfter(value);
    if (suggested) setEndTime(suggested);
  };

  const save = async () => {
    if (pending.current || saved || checking || lookupError) return;
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
    pending.current = true;
    setSaving(true);
    try {
      const link = await teacherService.makeup(lessonId, { date, startTime, endTime, reason: reason || undefined });
      setSaved(true);
      setDate(link.newLesson.date);
      setMsg(`Reposição agendada para ${link.newLesson.date} às ${link.newLesson.startTime.slice(0, 5)}`);
    } catch (error) {
      setMsg(apiErrorMessage(error, "Erro ao agendar reposição"));
    } finally {
      pending.current = false;
      setSaving(false);
    }
  };

  const field = (ph: string, v: string, set: (s: string) => void) => (
    <TextInput
      className="bg-white border border-[#D5D5D5] text-[#17131A] rounded-lg p-4 mb-4"
      placeholder={ph}
      placeholderTextColor="#9A969B"
      autoCapitalize="none"
      value={v}
      onChangeText={set}
      editable={!saving && !saved && !checking}
    />
  );

  return (
    <ScrollView className="flex-1 bg-[#F4F4F4]" contentContainerStyle={{ paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
      <ScreenHeader title="Reposição" back />
      <View style={{ paddingHorizontal: 18 }}>
        <Text className="text-[#17131A] font-semibold mb-2">Nova data</Text>
        {field("Data (AAAA-MM-DD)", date, setDate)}
        <Text className="text-[#17131A] font-semibold mb-2">Horário</Text>
        {field("Início (HH:MM)", startTime, changeStart)}
        {field("Fim (HH:MM)", endTime, setEndTime)}
        <Text className="text-[#17131A] font-semibold mb-2">Motivo</Text>
        {field("Motivo", reason, setReason)}
        <Pressable accessibilityRole="button" disabled={saving || saved || checking || lookupError} className="bg-[#7040C5] rounded-lg p-4 items-center" onPress={save}>
          <Text className="text-white font-semibold">{checking ? "Consultando reposição..." : "Agendar reposição"}</Text>
        </Pressable>
        {msg ? <Text className="text-[#5930A9] mt-4">{msg}</Text> : null}
        {lookupError ? <Pressable accessibilityRole="button" onPress={() => setRetry((value) => value + 1)}><Text className="text-[#5930A9] mt-4">Tentar novamente</Text></Pressable> : null}
        {saved ? (
          <Pressable accessibilityRole="button" className="bg-white border border-[#7040C5] rounded-lg p-4 items-center mt-3" onPress={() => router.replace({ pathname: "/(teacher)/schedule", params: { date } })}>
            <Text className="text-[#5930A9]">Voltar à agenda</Text>
          </Pressable>
        ) : null}
      </View>
    </ScrollView>
  );
}
