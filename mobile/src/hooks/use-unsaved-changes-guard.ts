import { useEffect, useRef } from "react";
import { useNavigation } from "expo-router";
import { confirm } from "@/lib/confirm";

export function useUnsavedChangesGuard(dirty: boolean) {
  const navigation = useNavigation();
  const dirtyRef = useRef(dirty);
  const saved = useRef(false);
  const confirming = useRef(false);
  dirtyRef.current = dirty;

  useEffect(() => {
    if (!dirty) return;
    // Native-stack gestures dismiss the screen before beforeRemove can cancel.
    navigation.setOptions({ gestureEnabled: false });
    return () => navigation.setOptions({ gestureEnabled: true });
  }, [dirty, navigation]);

  useEffect(() => navigation.addListener("beforeRemove", (event) => {
    if (!dirtyRef.current || saved.current) return;
    event.preventDefault();
    if (confirming.current) return;
    confirming.current = true;
    void confirm({
      title: "Descartar alterações?",
      message: "Os dados preenchidos serão perdidos.",
      confirmLabel: "Descartar",
      destructive: true,
    }).then((discard) => {
      if (discard) {
        saved.current = true;
        navigation.dispatch(event.data.action);
      }
    }).finally(() => { confirming.current = false; });
  }), [navigation]);

  return () => { saved.current = true; };
}
