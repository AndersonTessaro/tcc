import { View, ActivityIndicator } from "react-native";
import { colors } from "@/ui/theme";

// Rota raiz: o Guard em _layout redireciona conforme autenticação/papel.
export default function Index() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.screen }}>
      <ActivityIndicator color={colors.accent} />
    </View>
  );
}
