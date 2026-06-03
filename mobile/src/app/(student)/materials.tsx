import { useEffect, useState } from "react";
import { View, Text, TextInput, FlatList } from "react-native";
import { studentService } from "@/features/student/studentService";
import { Card } from "@/ui/Card";

export default function Materials() {
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    const t = setTimeout(() => {
      studentService.materials(search).then(setItems).catch(() => setItems([]));
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <View className="flex-1 bg-bg p-6">
      <TextInput
        className="bg-white/10 text-white rounded-xl p-4 mb-4"
        placeholder="Buscar material"
        placeholderTextColor="#9ca3af"
        value={search}
        onChangeText={setSearch}
      />
      <FlatList
        data={items}
        keyExtractor={(m) => m.id}
        ListEmptyComponent={<Text className="text-white/50">Nenhum material.</Text>}
        renderItem={({ item }) => (
          <Card>
            <Text className="text-white font-semibold">{item.title}</Text>
            <Text className="text-white/60">{item.description ?? item.fileName}</Text>
          </Card>
        )}
      />
    </View>
  );
}
