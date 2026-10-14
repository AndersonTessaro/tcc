import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, MIN_TOUCH, space, type } from "@/ui/theme";

export type StudentSection = "summary" | "lessons" | "attendance" | "practice" | "materials";

const sections: { value: StudentSection; label: string }[] = [
  { value: "summary", label: "Resumo" },
  { value: "lessons", label: "Aulas" },
  { value: "attendance", label: "Frequência" },
  { value: "practice", label: "Prática" },
  { value: "materials", label: "Materiais" },
];

export function TeacherStudentSections({ value, onChange }: { value: StudentSection; onChange: (value: StudentSection) => void }) {
  return (
    <View style={styles.strip}>
      <ScrollView horizontal style={styles.scroll} contentContainerStyle={styles.tabs} showsHorizontalScrollIndicator={false}>
        <View accessibilityRole="tablist" accessibilityLabel="Seções do aluno" style={styles.tabs}>
          {sections.map((section) => (
            <Pressable
              key={section.value}
              accessibilityRole="tab"
              accessibilityLabel={section.label}
              aria-selected={value === section.value}
              onPress={() => onChange(section.value)}
              style={({ pressed }) => [styles.tab, value === section.value && styles.selected, pressed && styles.pressed]}
            >
              <Text style={[styles.label, value === section.value && styles.selectedLabel]}>{section.label}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: { borderBottomWidth: 1, borderBottomColor: colors.progressTrack },
  scroll: { flexGrow: 0 },
  tabs: { flexDirection: "row", flexGrow: 1 },
  tab: { minHeight: MIN_TOUCH, flexGrow: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: space.sm, borderBottomWidth: 3, borderBottomColor: "transparent" },
  selected: { borderBottomColor: colors.primary },
  label: { ...type.body, fontSize: 14 },
  selectedLabel: { color: colors.primary, fontWeight: "600" },
  pressed: { opacity: 0.7 },
});
