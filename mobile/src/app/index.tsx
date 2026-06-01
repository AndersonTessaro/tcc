import { View, ActivityIndicator } from "react-native";

// Rota raiz: o Guard em _layout redireciona conforme autenticação/papel.
export default function Index() {
  return (
    <View className="flex-1 items-center justify-center bg-bg">
      <ActivityIndicator color="#6C5CE7" />
    </View>
  );
}
