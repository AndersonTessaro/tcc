import { useState } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { studentService } from "@/features/student/studentService";

export default function Practice() {
  const [min, setMin] = useState("30");
  const [notes, setNotes] = useState("");
  const [msg, setMsg] = useState("");

  const register = async () => {
    setMsg("");
    try {
      const prog = await studentService.registerPractice(Number(min), notes || undefined);
      setMsg(`+XP! Total: ${prog.xpTotal} XP · Nível ${prog.level}`);
      setNotes("");
    } catch {
      setMsg("Erro ao registrar");
    }
  };

  return (
    <View className="flex-1 bg-bg p-6">
      <Text className="text-2xl font-bold text-white mb-6">Registrar prática</Text>
      <Text className="text-white/70 mb-1">Duração (min)</Text>
      <TextInput
        className="bg-white/10 text-white rounded-xl p-4 mb-3"
        keyboardType="numeric"
        value={min}
        onChangeText={setMin}
      />
      <Text className="text-white/70 mb-1">Observação</Text>
      <TextInput
        className="bg-white/10 text-white rounded-xl p-4 mb-4"
        placeholder="O que estudou?"
        placeholderTextColor="#9ca3af"
        value={notes}
        onChangeText={setNotes}
      />
      <Pressable className="bg-accent rounded-xl p-4 items-center" onPress={register}>
        <Text className="text-white font-semibold">Registrar</Text>
      </Pressable>
      {msg ? <Text className="text-accent mt-4">{msg}</Text> : null}
    </View>
  );
}
