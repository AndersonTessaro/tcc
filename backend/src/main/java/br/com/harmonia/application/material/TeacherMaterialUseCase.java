package br.com.harmonia.application.material;

import br.com.harmonia.application.context.CurrentUserService;
import br.com.harmonia.application.material.port.MaterialRepository;
import br.com.harmonia.application.profile.port.StudentRepository;
import br.com.harmonia.infrastructure.persistence.material.Material;
import br.com.harmonia.infrastructure.storage.FileStoragePort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.UUID;

@Service
public class TeacherMaterialUseCase {
    private final MaterialRepository materials;
    private final StudentRepository students;
    private final FileStoragePort storage;
    private final CurrentUserService current;

    public TeacherMaterialUseCase(MaterialRepository materials, StudentRepository students,
                                  FileStoragePort storage, CurrentUserService current) {
        this.materials = materials;
        this.students = students;
        this.storage = storage;
        this.current = current;
    }

    @Transactional
    public Material attach(UUID studentId, String title, String description, MultipartFile file) {
        try {
            String path = storage.save(file.getOriginalFilename(), file.getBytes());
            Material m = new Material();
            m.setTeacher(current.currentTeacher());
            m.setStudent(students.findById(studentId).orElseThrow());
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
