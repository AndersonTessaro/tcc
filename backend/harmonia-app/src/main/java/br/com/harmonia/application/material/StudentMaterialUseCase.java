package br.com.harmonia.application.material;

import br.com.harmonia.domain.common.ResourceNotFoundException;
import br.com.harmonia.application.context.CurrentUserService;
import br.com.harmonia.application.material.port.MaterialRepository;
import br.com.harmonia.application.lesson.port.LessonAttachmentRepository;
import br.com.harmonia.infrastructure.persistence.material.Material;
import br.com.harmonia.infrastructure.storage.FileStoragePort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Comparator;
import java.util.Locale;
import java.util.UUID;
import java.util.stream.Stream;

@Service
public class StudentMaterialUseCase {
    private final MaterialRepository materials;
    private final FileStoragePort storage;
    private final CurrentUserService current;
    private final LessonAttachmentRepository attachments;

    public StudentMaterialUseCase(MaterialRepository materials, FileStoragePort storage, CurrentUserService current,
                                  LessonAttachmentRepository attachments) {
        this.materials = materials;
        this.storage = storage;
        this.current = current;
        this.attachments = attachments;
    }

    @Transactional(readOnly = true)
    public List<MaterialItem> list(String search) {
        var studentId = current.currentStudent().getId();
        var found = (search == null || search.isBlank())
            ? materials.findByStudentId(studentId)
            : materials.findByStudentIdAndTitleContainingIgnoreCase(studentId, search);
        String term = search == null || search.isBlank() ? "" : search.toLowerCase(Locale.ROOT);
        var lessonItems = attachments.findByLessonEnrollmentStudentId(studentId).stream()
            .filter(a -> a.getFileName().toLowerCase(Locale.ROOT).contains(term)).map(MaterialItem::of);
        return Stream.concat(found.stream().map(MaterialItem::of), lessonItems)
            .sorted(Comparator.comparing(MaterialItem::createdAt).reversed()).toList();
    }

    public byte[] download(UUID materialId) {
        Material m = materials.findById(materialId).orElseThrow(() -> new ResourceNotFoundException("Material"));
        current.assertOwnedByCurrentStudent(m.getStudent());
        return storage.read(m.getStoragePath());
    }
}
