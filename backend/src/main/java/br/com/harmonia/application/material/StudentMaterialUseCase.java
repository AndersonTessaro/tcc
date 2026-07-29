package br.com.harmonia.application.material;

import br.com.harmonia.application.context.CurrentUserService;
import br.com.harmonia.application.material.port.MaterialRepository;
import br.com.harmonia.infrastructure.persistence.material.Material;
import br.com.harmonia.infrastructure.storage.FileStoragePort;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class StudentMaterialUseCase {
    private final MaterialRepository materials;
    private final FileStoragePort storage;
    private final CurrentUserService current;

    public StudentMaterialUseCase(MaterialRepository materials, FileStoragePort storage, CurrentUserService current) {
        this.materials = materials;
        this.storage = storage;
        this.current = current;
    }

    public List<Material> list(String search) {
        var studentId = current.currentStudent().getId();
        return (search == null || search.isBlank())
            ? materials.findByStudentId(studentId)
            : materials.findByStudentIdAndTitleContainingIgnoreCase(studentId, search);
    }

    public byte[] download(UUID materialId) {
        Material m = materials.findById(materialId).orElseThrow();
        current.assertOwnedByCurrentStudent(m.getStudent());
        return storage.read(m.getStoragePath());
    }
}
