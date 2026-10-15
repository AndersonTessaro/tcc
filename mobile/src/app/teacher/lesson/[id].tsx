import { useLocalSearchParams } from "expo-router";
import { LessonForm } from "@/features/teacher/LessonFormScreen";

export default function EditLesson() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <LessonForm key={id} id={id} />;
}
