import type { ComponentProps } from "react";
import { Image, Pressable, StyleSheet, Text, View, type ImageSourcePropType } from "react-native";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useKeyboardVisible } from "@/hooks/use-keyboard-visible";
import { haptics } from "@/lib/haptics";
import { colors, space } from "@/ui/theme";

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>["tabBar"]>>[0];

export type TabConfig = { name: string; label: string; icon: ImageSourcePropType; size: number };

export function AppTabBar({ state, navigation, tabs }: TabBarProps & { tabs: readonly TabConfig[] }) {
  const insets = useSafeAreaInsets();
  const keyboardVisible = useKeyboardVisible();
  const activeName = state.routes[state.index]?.name;

  if (keyboardVisible) return null;
  return (
    <View accessibilityRole="tablist" style={[styles.bar, { paddingBottom: Math.max(insets.bottom, space.sm) }]}>
      {tabs.map((tab) => {
        const route = state.routes.find((entry) => entry.name === tab.name);
        if (!route) return null;
        const focused = activeName === tab.name;
        const tint = focused ? colors.primary : colors.muted;
        const onPress = () => {
          const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
          if (focused || event.defaultPrevented) return;
          haptics.select();
          navigation.navigate(route.name);
        };
        return (
          <Pressable
            key={tab.name}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: focused }}
            onPress={onPress}
            style={({ pressed }) => [styles.item, pressed && styles.pressed]}
          >
            <View style={[styles.indicator, focused && styles.indicatorActive]} />
            <Image source={tab.icon} accessible={false} style={{ width: tab.size, height: tab.size, tintColor: tint }} />
            <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={[styles.label, { color: tint }, focused && styles.labelActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: "row", backgroundColor: colors.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingHorizontal: space.xs },
  item: { flex: 1, minHeight: 60, alignItems: "center", justifyContent: "center", gap: 4, paddingTop: space.sm },
  pressed: { opacity: 0.7 },
  indicator: { position: "absolute", top: 0, width: 36, height: 3, borderBottomLeftRadius: 3, borderBottomRightRadius: 3, backgroundColor: "transparent" },
  indicatorActive: { backgroundColor: colors.primary },
  label: { fontSize: 12, fontWeight: "500" },
  labelActive: { fontWeight: "700" },
});
