import { useState } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { alunoService } from "@/features/aluno/alunoService";

export default function Pratica() {
  const [min, setMin] = useState("30");
  const [obs, setObs] = useState("");
  const [msg, setMsg] = useState("");

  const registrar = async () => {
    setMsg("");
    try {
      const prog = await alunoService.registrarPratica(Number(min), obs || undefined);
      setMsg(`+XP! Total: ${prog.xpTotal} XP · Nível ${prog.nivel}`);
      setObs("");
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
        value={obs}
        onChangeText={setObs}
      />
      <Pressable className="bg-accent rounded-xl p-4 items-center" onPress={registrar}>
        <Text className="text-white font-semibold">Registrar</Text>
      </Pressable>
      {msg ? <Text className="text-accent mt-4">{msg}</Text> : null}
    </View>
  );
}
