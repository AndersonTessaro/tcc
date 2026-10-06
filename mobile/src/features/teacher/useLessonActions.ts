import { useCallback, useRef, useState } from "react";
import { confirm } from "@/lib/confirm";
import { apiErrorMessage } from "@/lib/http/errorMessage";
import { teacherService, type AttendanceStatus, type LessonStatus, type TeacherLesson } from "./teacherService";

type LessonPatch = Partial<TeacherLesson>;

type Options = {
  applyLesson: (lessonId: string, patch: LessonPatch) => void;
  onSuccess?: () => void;
};

const STATUS_CONFIRM: Record<Exclude<LessonStatus, "SCHEDULED">, { title: string; message: string; confirmLabel: string; destructive: boolean }> = {
  DONE: { title: "Concluir aula?", message: "A aula será marcada como realizada.", confirmLabel: "Concluir", destructive: false },
  CANCELED: { title: "Cancelar aula?", message: "O horário será liberado e a aula não poderá receber frequência.", confirmLabel: "Cancelar aula", destructive: true },
};

export function useLessonActions({ applyLesson, onSuccess }: Options) {
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const pending = useRef(new Set<string>());

  const run = useCallback(async (lessonId: string, task: () => Promise<void>, fallback: string, rollback?: () => void): Promise<boolean> => {
    if (pending.current.has(lessonId)) return false;
    pending.current.add(lessonId);
    setBusy((current) => ({ ...current, [lessonId]: true }));
    setErrors(({ [lessonId]: _cleared, ...rest }) => rest);
    try {
      await task();
      onSuccess?.();
      return true;
    } catch (error) {
      rollback?.();
      setErrors((current) => ({ ...current, [lessonId]: apiErrorMessage(error, fallback) }));
      return false;
    } finally {
      pending.current.delete(lessonId);
      setBusy(({ [lessonId]: _done, ...rest }) => rest);
    }
  }, [onSuccess]);

  const markAttendance = useCallback((lesson: TeacherLesson, status: AttendanceStatus, justification?: string) => {
    const previous = lesson.attendance;
    return run(lesson.id, async () => {
      applyLesson(lesson.id, { attendance: status });
      if (justification) await teacherService.attendance(lesson.id, status, justification);
      else await teacherService.attendance(lesson.id, status);
    }, "Erro ao marcar frequência", () => applyLesson(lesson.id, { attendance: previous }));
  }, [applyLesson, run]);

  const changeStatus = useCallback(async (lesson: TeacherLesson, status: Exclude<LessonStatus, "SCHEDULED">) => {
    if (pending.current.has(lesson.id)) return false;
    if (!(await confirm(STATUS_CONFIRM[status]))) return false;
    return run(lesson.id, async () => {
      const updated = await teacherService.changeLessonStatus(lesson.id, status);
      applyLesson(lesson.id, { ...updated, attendance: updated.attendance ?? lesson.attendance });
    }, "Erro ao alterar a aula");
  }, [applyLesson, run]);

  return { busy, errors, markAttendance, changeStatus };
}
