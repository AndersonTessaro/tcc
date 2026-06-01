package br.com.harmonia.application.material;

import br.com.harmonia.application.contexto.CurrentUserService;
import br.com.harmonia.application.material.port.MaterialRepository;
import br.com.harmonia.domain.comum.OwnershipException;
import br.com.harmonia.infrastructure.persistence.material.Material;
import br.com.harmonia.infrastructure.storage.ArquivoStoragePort;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class AlunoMaterialUseCase {
    private final MaterialRepository materiais;
    private final ArquivoStoragePort storage;
    private final CurrentUserService current;

    public AlunoMaterialUseCase(MaterialRepository materiais, ArquivoStoragePort storage, CurrentUserService current) {
        this.materiais = materiais;
        this.storage = storage;
        this.current = current;
    }

    public List<Material> listar(String busca) {
        var alunoId = current.alunoAtual().getId();
        return (busca == null || busca.isBlank())
            ? materiais.findByAlunoId(alunoId)
            : materiais.findByAlunoIdAndTituloContainingIgnoreCase(alunoId, busca);
    }

    public byte[] baixar(UUID materialId) {
        Material m = materiais.findById(materialId).orElseThrow();
        if (!m.getAluno().getId().equals(current.alunoAtual().getId()))
            throw new OwnershipException("Material de outro aluno");
        return storage.ler(m.getStoragePath());
    }
}
