package br.com.harmonia.application.material;

import br.com.harmonia.application.contexto.CurrentUserService;
import br.com.harmonia.application.material.port.MaterialRepository;
import br.com.harmonia.application.perfil.port.AlunoRepository;
import br.com.harmonia.infrastructure.persistence.material.Material;
import br.com.harmonia.infrastructure.storage.ArquivoStoragePort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.UUID;

@Service
public class ProfessorMaterialUseCase {
    private final MaterialRepository materiais;
    private final AlunoRepository alunos;
    private final ArquivoStoragePort storage;
    private final CurrentUserService current;

    public ProfessorMaterialUseCase(MaterialRepository materiais, AlunoRepository alunos,
                                    ArquivoStoragePort storage, CurrentUserService current) {
        this.materiais = materiais;
        this.alunos = alunos;
        this.storage = storage;
        this.current = current;
    }

    @Transactional
    public Material anexar(UUID alunoId, String titulo, String descricao, MultipartFile arquivo) {
        try {
            String path = storage.salvar(arquivo.getOriginalFilename(), arquivo.getBytes());
            Material m = new Material();
            m.setProfessor(current.professorAtual());
            m.setAluno(alunos.findById(alunoId).orElseThrow());
            m.setTitulo(titulo);
            m.setDescricao(descricao);
            m.setNomeArquivo(arquivo.getOriginalFilename());
            m.setStoragePath(path);
            m.setContentType(arquivo.getContentType());
            m.setTamanhoBytes(arquivo.getSize());
            return materiais.save(m);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }
}
