import { useState } from "react";
import { ScrollView, Text, TextInput, Pressable } from "react-native";
import { professorService } from "@/features/professor/professorService";

export default function NovaAula() {
  const [matriculaId, setMatriculaId] = useState("");
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [hora, setHora] = useState("10:00");
  const [conteudo, setConteudo] = useState("");
  const [tarefa, setTarefa] = useState("");
  const [msg, setMsg] = useState("");

  const salvar = async () => {
    setMsg("");
    try {
      await professorService.novaAula({
        matriculaId,
        data,
        horaInicio: hora,
        conteudo: conteudo || undefined,
        tarefaCasa: tarefa || undefined,
      });
      setMsg("Aula registrada!");
      setConteudo("");
      setTarefa("");
    } catch {
      setMsg("Erro ao registrar aula");
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
      {field("ID da matrícula", matriculaId, setMatriculaId)}
      {field("Data (AAAA-MM-DD)", data, setData)}
      {field("Hora (HH:MM)", hora, setHora)}
      {field("Conteúdo", conteudo, setConteudo)}
      {field("Tarefa de casa", tarefa, setTarefa)}
      <Pressable className="bg-primary rounded-xl p-4 items-center" onPress={salvar}>
        <Text className="text-white font-semibold">Salvar</Text>
      </Pressable>
      {msg ? <Text className="text-accent mt-4">{msg}</Text> : null}
    </ScrollView>
  );
}
