import { View, Text, DimensionValue } from "react-native";

export function XpBar({ xp, level }: { xp: number; level: number }) {
  const base = (level - 1) ** 2 * 100;
  const next = level ** 2 * 100;
  const pct = Math.min(100, Math.round(((xp - base) / (next - base)) * 100));
  const width = `${pct}%` as DimensionValue;
  return (
    <View>
      <Text className="text-[#17131A] font-semibold mb-3">
        Nível {level} · {xp} XP
      </Text>
      <View className="h-3 bg-[#CECED0] rounded-full overflow-hidden">
        <View className="h-3 bg-[#7040C5] rounded-full" style={{ width }} />
      </View>
    </View>
  );
}
