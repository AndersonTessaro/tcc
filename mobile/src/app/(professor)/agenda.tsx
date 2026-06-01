import { useEffect, useState, useCallback } from "react";
import { View, Text, TextInput, Pressable, FlatList } from "react-native";
import { professorService } from "@/features/professor/professorService";
import { Card } from "@/ui/Card";

export default function Agenda() {
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [aulas, setAulas] = useState<any[]>([]);
  const [msg, setMsg] = useState("");

  const load = useCallback(() => {
    professorService.agenda(data).then(setAulas).catch(() => setAulas([]));
  }, [data]);
  useEffect(() => {
    load();
  }, [load]);

  const marcar = async (aulaId: string, status: string) => {
    setMsg("");
    try {
      await professorService.frequencia(aulaId, status);
      setMsg(`Frequência: ${status}`);
    } catch {
      setMsg("Erro ao marcar");
    }
  };

  return (
    <View className="flex-1 bg-bg p-6">
      <Text className="text-2xl font-bold text-white mb-3">Agenda</Text>
      <TextInput
        className="bg-white/10 text-white rounded-xl p-4 mb-4"
        value={data}
        onChangeText={setData}
        autoCapitalize="none"
      />
      {msg ? <Text className="text-accent mb-2">{msg}</Text> : null}
      <FlatList
        data={aulas}
        keyExtractor={(a) => a.id}
        ListEmptyComponent={<Text className="text-white/50">Sem aulas neste dia.</Text>}
        renderItem={({ item }) => (
          <Card>
            <Text className="text-white font-semibold mb-2">
              {item.horaInicio} · {item.conteudo ?? "—"}
            </Text>
            <View className="flex-row gap-2">
              <Pressable
                className="bg-accent rounded-lg px-3 py-2"
                onPress={() => marcar(item.id, "PRESENTE")}
              >
                <Text className="text-white">Presente</Text>
              </Pressable>
              <Pressable
                className="bg-white/10 rounded-lg px-3 py-2"
                onPress={() => marcar(item.id, "FALTA")}
              >
                <Text className="text-white">Falta</Text>
              </Pressable>
              <Pressable
                className="bg-white/10 rounded-lg px-3 py-2"
                onPress={() => marcar(item.id, "JUSTIFICADA")}
              >
                <Text className="text-white">Justificada</Text>
              </Pressable>
            </View>
          </Card>
        )}
      />
    </View>
  );
}
