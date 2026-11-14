import { useLocalSearchParams } from "expo-router";
import { LessonForm } from "@/features/teacher/LessonFormScreen";
import type { LessonSection } from "@/features/teacher/agenda";

const SECTIONS: LessonSection[] = ["schedule", "content", "practice"];

export default function EditLesson() {
  const { id, section } = useLocalSearchParams<{ id: string; section?: string }>();
  const known = SECTIONS.find((item) => item === section);
  return <LessonForm key={`${id}-${known ?? "all"}`} id={id} section={known} />;
}
