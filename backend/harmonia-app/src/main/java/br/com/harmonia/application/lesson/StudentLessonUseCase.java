package br.com.harmonia.application.lesson;

import br.com.harmonia.application.lesson.port.LessonAttachmentRepository;
import br.com.harmonia.application.lesson.port.LessonRepository;
import br.com.harmonia.application.context.CurrentUserService;
import br.com.harmonia.infrastructure.persistence.lesson.Lesson;
import br.com.harmonia.infrastructure.persistence.lesson.LessonAttachment;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
public class StudentLessonUseCase {
    private final LessonRepository lessons;
    private final LessonAttachmentRepository attachments;
    private final CurrentUserService current;

    public StudentLessonUseCase(LessonRepository lessons, LessonAttachmentRepository attachments, CurrentUserService current) {
        this.lessons = lessons;
        this.attachments = attachments;
        this.current = current;
    }

    public List<Lesson> myLessons(boolean upcoming) {
        var studentId = current.currentStudent().getId();
        LocalDate today = LocalDate.now();
        return lessons.findByEnrollmentStudentIdOrderByDateDesc(studentId).stream()
            .filter(l -> upcoming ? !l.getDate().isBefore(today) : l.getDate().isBefore(today))
            .toList();
    }

    public Lesson detail(UUID lessonId) {
        Lesson l = lessons.findById(lessonId).orElseThrow();
        current.assertOwnedByCurrentStudent(l.getEnrollment().getStudent());
        return l;
    }

    public List<LessonAttachment> attachments(UUID lessonId) {
        detail(lessonId);
        return attachments.findByLessonId(lessonId);
    }
}
