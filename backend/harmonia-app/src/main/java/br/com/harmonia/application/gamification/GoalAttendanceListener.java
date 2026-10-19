package br.com.harmonia.application.gamification;

import br.com.harmonia.application.lesson.port.LessonRepository;
import br.com.harmonia.lessoncore.AttendanceEffect;
import br.com.harmonia.lessoncore.AttendanceRecordedEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class GoalAttendanceListener {
    private final LessonRepository lessons;
    private final GoalProgressService progress;

    public GoalAttendanceListener(LessonRepository lessons, GoalProgressService progress) {
        this.lessons = lessons;
        this.progress = progress;
    }

    @EventListener
    @Transactional
    public void onAttendanceRecorded(AttendanceRecordedEvent event) {
        if (event.effect() != AttendanceEffect.AWARD_XP) return;
        lessons.findById(event.lessonId()).ifPresent(lesson ->
            progress.notifyReached(event.studentId(), facts -> facts.withoutPresence(lesson.getDate())));
    }
}
