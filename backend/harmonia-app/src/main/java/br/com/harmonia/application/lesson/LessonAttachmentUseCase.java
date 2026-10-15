package br.com.harmonia.application.lesson;

import br.com.harmonia.application.context.CurrentUserService;
import br.com.harmonia.application.lesson.port.LessonAttachmentRepository;
import br.com.harmonia.application.lesson.port.LessonRepository;
import br.com.harmonia.application.storage.StorageTransactions;
import br.com.harmonia.domain.common.ResourceNotFoundException;
import br.com.harmonia.domain.lesson.LessonAttachmentRule;
import br.com.harmonia.infrastructure.persistence.lesson.Lesson;
import br.com.harmonia.infrastructure.persistence.lesson.LessonAttachment;
import br.com.harmonia.infrastructure.storage.FileStoragePort;
import br.com.harmonia.lessoncore.LessonLifecyclePolicy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.Arrays;
import java.util.UUID;

@Service
public class LessonAttachmentUseCase {
    private final LessonRepository lessons;
    private final LessonAttachmentRepository attachments;
    private final StudentLessonUseCase studentLessons;
    private final CurrentUserService current;
    private final FileStoragePort storage;
    private final LessonLifecyclePolicy lifecyclePolicy = new LessonLifecyclePolicy();

    public LessonAttachmentUseCase(LessonRepository lessons, LessonAttachmentRepository attachments,
                                   StudentLessonUseCase studentLessons, CurrentUserService current,
                                   FileStoragePort storage) {
        this.lessons = lessons;
        this.attachments = attachments;
        this.studentLessons = studentLessons;
        this.current = current;
        this.storage = storage;
    }

    // ponytail: the database connection stays held during Drive upload; concurrent uploads can exceed ten attachments; lock the lesson if needed.
    @Transactional
    public LessonAttachment upload(UUID lessonId, MultipartFile file) {
        Lesson lesson = teacherLesson(lessonId);
        lifecyclePolicy.validateContentEdit(LessonStatuses.toSessionStatus(lesson.getStatus()));
        String fileName = displayName(file.getOriginalFilename());
        try {
            byte[] content = file.getBytes();
            LessonAttachmentRule.validate(fileName, file.getContentType(), file.getSize(),
                Arrays.copyOf(content, Math.min(content.length, LessonAttachmentRule.HEAD_BYTES)),
                attachments.countByLessonId(lessonId));
            String path = storage.save(fileName, content);
            StorageTransactions.deleteOnRollback(storage, path);
            LessonAttachment attachment = new LessonAttachment();
            attachment.setLesson(lesson);
            attachment.setFileName(fileName);
            attachment.setContentType(file.getContentType());
            attachment.setSizeBytes(file.getSize());
            attachment.setStoragePath(path);
            return attachments.save(attachment);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    @Transactional
    public void delete(UUID lessonId, UUID attachmentId) {
        Lesson lesson = teacherLesson(lessonId);
        lifecyclePolicy.validateContentEdit(LessonStatuses.toSessionStatus(lesson.getStatus()));
        LessonAttachment attachment = findAttachment(lessonId, attachmentId);
        attachments.delete(attachment);
        StorageTransactions.deleteAfterCommit(storage, attachment.getStoragePath());
    }

    @Transactional(readOnly = true)
    public byte[] downloadAsTeacher(UUID lessonId, UUID attachmentId) {
        teacherLesson(lessonId);
        return storage.read(findAttachment(lessonId, attachmentId).getStoragePath());
    }

    @Transactional(readOnly = true)
    public byte[] downloadAsStudent(UUID lessonId, UUID attachmentId) {
        studentLessons.detail(lessonId);
        return storage.read(findAttachment(lessonId, attachmentId).getStoragePath());
    }

    private Lesson teacherLesson(UUID lessonId) {
        Lesson lesson = lessons.findById(lessonId).orElseThrow(() -> new ResourceNotFoundException("Lesson"));
        current.assertOwnedByCurrentTeacher(lesson.getEnrollment());
        return lesson;
    }

    private LessonAttachment findAttachment(UUID lessonId, UUID attachmentId) {
        return attachments.findByIdAndLessonId(attachmentId, lessonId)
            .orElseThrow(() -> new ResourceNotFoundException("Attachment"));
    }

    private static String displayName(String original) {
        String name = original == null || original.isBlank() ? "attachment" : original.strip();
        return name.length() > 255 ? name.substring(name.length() - 255) : name;
    }
}
