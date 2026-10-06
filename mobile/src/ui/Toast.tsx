import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AccessibilityInfo, Animated, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { haptics } from "@/lib/haptics";
import { colors, radius, shadow, space } from "./theme";

type Tone = "success" | "error" | "info";
type ToastMessage = { id: number; message: string; tone: Tone };
type ToastApi = { show: (message: string, tone?: Tone) => void };

const ToastContext = createContext<ToastApi>({ show: () => undefined });

const VISIBLE_MS = 2800;
const icons: Record<Tone, keyof typeof Ionicons.glyphMap> = { success: "checkmark-circle", error: "alert-circle", info: "information-circle" };
const iconColors: Record<Tone, string> = { success: "#7DDBA4", error: "#FF9C92", info: colors.onBrandMuted };

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const nextId = useRef(0);

  const show = useCallback((message: string, tone: Tone = "success") => {
    if (tone === "success") haptics.success();
    if (tone === "error") haptics.error();
    AccessibilityInfo.announceForAccessibility(message);
    setToast({ id: ++nextId.current, message, tone });
  }, []);

  const hide = useCallback((id: number) => setToast((current) => (current?.id === id ? null : current)), []);
  const api = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {toast ? <ToastView key={toast.id} toast={toast} onHide={hide} /> : null}
    </ToastContext.Provider>
  );
}

function ToastView({ toast, onHide }: { toast: ToastMessage; onHide: (id: number) => void }) {
  const insets = useSafeAreaInsets();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const enter = Animated.timing(progress, { toValue: 1, duration: 180, useNativeDriver: true });
    const exit = Animated.timing(progress, { toValue: 0, duration: 160, useNativeDriver: true });
    enter.start();
    const timer = setTimeout(() => exit.start(() => onHide(toast.id)), VISIBLE_MS);
    return () => {
      clearTimeout(timer);
      enter.stop();
      exit.stop();
    };
  }, [progress, onHide, toast.id]);

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] });

  return (
    <View pointerEvents="none" style={[styles.host, { top: insets.top + space.sm }]}>
      <Animated.View accessibilityLiveRegion="polite" style={[styles.toast, { opacity: progress, transform: [{ translateY }] }]}>
        <Ionicons name={icons[toast.tone]} size={20} color={iconColors[toast.tone]} />
        <Text style={styles.text}>{toast.message}</Text>
      </Animated.View>
    </View>
  );
}

export const useToast = () => useContext(ToastContext);

const styles = StyleSheet.create({
  host: { position: "absolute", left: space.lg, right: space.lg, alignItems: "center" },
  toast: { maxWidth: 480, width: "100%", flexDirection: "row", alignItems: "center", gap: space.sm, backgroundColor: colors.text, borderRadius: radius.md, paddingHorizontal: space.lg, paddingVertical: space.md, ...shadow },
  text: { flex: 1, color: colors.onBrand, fontSize: 14, fontWeight: "500" },
});
