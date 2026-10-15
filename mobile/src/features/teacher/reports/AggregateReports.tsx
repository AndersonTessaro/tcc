import { useRouter } from "expo-router";
import { formatDayMonth, formatMinutes } from "@/lib/format";
import { teacherService } from "../teacherService";
import { LOW_ATTENDANCE, percentLabel, ratingLabel, ReportBarRow, ReportScreen, ReportSection, ReportSummary } from "./ReportScreen";

type Props = { onBack: () => void };

const isLow = (rate: number | null) => rate != null && rate < LOW_ATTENDANCE;

export function AttendanceReportView({ onBack }: Props) {
  const router = useRouter();
  return (
    <ReportScreen
      title="Frequência dos alunos"
      onBack={onBack}
      load={teacherService.attendanceReport}
      isEmpty={(data) => data.students.length === 0}
      emptyTitle="Nenhum aluno vinculado"
      render={({ totals, students }) => (
        <>
          <ReportSummary
            headline={percentLabel(totals.rate)}
            caption={totals.due ? `de presença em ${totals.due} aulas` : "Nenhuma aula no período"}
            lines={[
              `${totals.present} presenças · ${totals.absent + totals.unrecorded} faltas (${totals.unrecorded} sem registro)`,
              `${totals.excused} faltas justificadas`,
            ]}
          />
          <ReportSection title="Por aluno" />
          {students.map(({ studentId, studentName, active, attendance }) => (
            <ReportBarRow
              key={studentId}
              title={active ? studentName : `${studentName} (inativo)`}
              valueLabel={percentLabel(attendance.rate)}
              value={attendance.rate ?? 0}
              max={100}
              alert={isLow(attendance.rate)}
              label={`Frequência de ${studentName}: ${percentLabel(attendance.rate)}`}
              detail={attendance.due
                ? `${attendance.present} de ${attendance.due} aulas · ${attendance.absent + attendance.unrecorded} faltas · ${attendance.excused} justificadas`
                : "Nenhuma aula no período"}
              onPress={() => router.push(`/(teacher)/student/${studentId}`)}
            />
          ))}
        </>
      )}
    />
  );
}

export function PracticeReportView({ onBack }: Props) {
  const router = useRouter();
  return (
    <ReportScreen
      title="Prática em casa"
      onBack={onBack}
      load={teacherService.practiceReport}
      isEmpty={(data) => data.students.length === 0}
      emptyTitle="Nenhum aluno vinculado"
      render={({ totals, weeks, students }) => {
        const maxWeek = Math.max(0, ...weeks.map((week) => week.minutes));
        const maxStudent = Math.max(0, ...students.map((student) => student.minutes));
        return (
          <>
            <ReportSummary
              headline={formatMinutes(totals.totalMinutes)}
              caption={`de prática em ${totals.sessions} sessões`}
              lines={[
                `${totals.practicingStudents} de ${totals.linkedStudents} alunos praticaram`,
                `Avaliação média: ${ratingLabel(totals.avgRating)}`,
              ]}
            />
            <ReportSection title="Por semana" />
            {weeks.map((week) => (
              <ReportBarRow
                key={week.weekStart}
                title={`Semana de ${formatDayMonth(week.weekStart)}`}
                valueLabel={formatMinutes(week.minutes)}
                value={week.minutes}
                max={maxWeek}
                label={`Semana de ${formatDayMonth(week.weekStart)}: ${formatMinutes(week.minutes)}`}
              />
            ))}
            <ReportSection title="Por aluno" />
            {students.map((student) => (
              <ReportBarRow
                key={student.studentId}
                title={student.studentName}
                valueLabel={formatMinutes(student.minutes)}
                value={student.minutes}
                max={maxStudent}
                alert={student.sessions === 0}
                label={`Prática de ${student.studentName}: ${formatMinutes(student.minutes)}`}
                detail={student.sessions
                  ? `${student.sessions} sessões em ${student.practiceDays} dias · última em ${formatDayMonth(student.lastPractice ?? "")} · avaliação ${ratingLabel(student.avgRating)}`
                  : "Sem prática no período"}
                onPress={() => router.push(`/(teacher)/student/${student.studentId}`)}
              />
            ))}
          </>
        );
      }}
    />
  );
}

export function ClassReportView({ onBack }: Props) {
  return (
    <ReportScreen
      title="Desempenho de turmas"
      onBack={onBack}
      load={teacherService.classReport}
      isEmpty={(data) => data.groups.length === 0}
      emptyTitle="Nenhuma turma ativa"
      render={({ groups }) => (
        <>
          <ReportSection title="Frequência e prática por turma" />
          {groups.map((group) => (
            <ReportBarRow
              key={group.name}
              title={group.name}
              valueLabel={percentLabel(group.attendance.rate)}
              value={group.attendance.rate ?? 0}
              max={100}
              alert={isLow(group.attendance.rate)}
              label={`Frequência da turma ${group.name}: ${percentLabel(group.attendance.rate)}`}
              detail={`${group.students} ${group.students === 1 ? "aluno" : "alunos"} · ${formatMinutes(group.avgPracticeMinPerStudent)} de prática por aluno · avaliação ${ratingLabel(group.avgRating)}`}
            />
          ))}
        </>
      )}
    />
  );
}
