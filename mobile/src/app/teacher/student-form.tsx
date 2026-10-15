import { useLocalSearchParams } from "expo-router";
import TeacherStudentForm from "@/features/teacher/TeacherStudentForm";

export default function StudentFormRoute() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  return <TeacherStudentForm key={id ?? "create"} id={id} />;
}
