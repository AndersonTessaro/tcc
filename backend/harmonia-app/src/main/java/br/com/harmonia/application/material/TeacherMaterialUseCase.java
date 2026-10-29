package br.com.harmonia.application.material;

import br.com.harmonia.domain.common.ResourceNotFoundException;
import br.com.harmonia.application.context.CurrentUserService;
import br.com.harmonia.application.material.port.MaterialRepository;
import br.com.harmonia.application.lesson.port.LessonAttachmentRepository;
import br.com.harmonia.application.profile.port.EnrollmentRepository;
import br.com.harmonia.application.profile.port.StudentRepository;
import br.com.harmonia.application.storage.StorageTransactions;
import br.com.harmonia.domain.common.OwnershipException;
import br.com.harmonia.domain.material.MaterialFileRule;
import br.com.harmonia.infrastructure.persistence.material.Material;
import br.com.harmonia.infrastructure.persistence.profile.Student;
import br.com.harmonia.infrastructure.persistence.profile.Teacher;
import br.com.harmonia.infrastructure.storage.FileStoragePort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.Arrays;
import java.util.UUID;
import java.util.List;
import java.util.Comparator;
import java.util.stream.Stream;

@Service
public class TeacherMaterialUseCase {
    private final MaterialRepository materials;
    private final StudentRepository students;
    private final EnrollmentRepository enrollments;
    private final FileStoragePort storage;
    private final CurrentUserService current;
    private final LessonAttachmentRepository attachments;

    public TeacherMaterialUseCase(MaterialRepository materials, StudentRepository students,
                                  EnrollmentRepository enrollments, FileStoragePort storage,
                                  CurrentUserService current, LessonAttachmentRepository attachments) {
        this.materials = materials;
        this.students = students;
        this.enrollments = enrollments;
        this.storage = storage;
        this.current = current;
        this.attachments = attachments;
    }

    @Transactional(readOnly = true)
    public List<MaterialItem> forStudent(UUID studentId) {
        assertLinked(studentId);
        var lessonItems = current.isAdmin() ? attachments.findByLessonEnrollmentStudentId(studentId)
            : attachments.findByLessonEnrollmentStudentIdAndLessonEnrollmentTeacherId(studentId, current.currentTeacher().getId());
        return Stream.concat(materials.findByStudentId(studentId).stream().map(MaterialItem::of),
                lessonItems.stream().map(MaterialItem::of))
            .sorted(Comparator.comparing(MaterialItem::createdAt).reversed()).toList();
    }

    @Transactional(readOnly = true)
    public byte[] download(UUID materialId) {
        Material m = materials.findById(materialId).orElseThrow(() -> new ResourceNotFoundException("Material"));
        assertLinked(m.getStudent().getId());
        return storage.read(m.getStoragePath());
    }

    private void assertLinked(UUID studentId) {
        if (!current.isAdmin() && enrollments.findByTeacherIdAndStudentId(
            current.currentTeacher().getId(), studentId).isEmpty())
            throw new OwnershipException("Student is not linked to this teacher");
    }

    @Transactional
    public Material attach(UUID studentId, String title, String description, MultipartFile file) {
        Teacher teacher = current.currentTeacher();
        Student student = students.findById(studentId).orElseThrow(() -> new ResourceNotFoundException("Student"));
        if (enrollments.findByTeacherIdAndStudentId(teacher.getId(), studentId).isEmpty())
            throw new OwnershipException("Student is not linked to this teacher");
        try {
            byte[] content = file.getBytes();
            MaterialFileRule.validate(file.getOriginalFilename(), file.getSize(),
                Arrays.copyOf(content, Math.min(content.length, MaterialFileRule.HEAD_BYTES)));
            String path = storage.save(file.getOriginalFilename(), content);
            StorageTransactions.deleteOnRollback(storage, path);
            Material m = new Material();
            m.setTeacher(teacher);
            m.setStudent(student);
            m.setTitle(title);
            m.setDescription(description);
            m.setFileName(file.getOriginalFilename());
            m.setStoragePath(path);
            m.setContentType(file.getContentType());
            m.setSizeBytes(file.getSize());
            return materials.save(m);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }
}
