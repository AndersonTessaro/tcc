import { View, Text, DimensionValue } from "react-native";

export function XpBar({ xp, nivel }: { xp: number; nivel: number }) {
  const base = (nivel - 1) ** 2 * 100;
  const next = nivel ** 2 * 100;
  const pct = Math.min(100, Math.round(((xp - base) / (next - base)) * 100));
  const width = `${pct}%` as DimensionValue;
  return (
    <View>
      <Text className="text-white font-semibold mb-1">
        Nível {nivel} · {xp} XP
      </Text>
      <View className="h-3 bg-white/10 rounded-full overflow-hidden">
        <View className="h-3 bg-accent rounded-full" style={{ width }} />
      </View>
    </View>
  );
}
