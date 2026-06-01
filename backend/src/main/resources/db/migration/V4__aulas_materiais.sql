CREATE TABLE aula (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    matricula_id UUID NOT NULL REFERENCES matricula(id),
    data         DATE NOT NULL,
    hora_inicio  TIME NOT NULL,
    hora_fim     TIME,
    status       VARCHAR(20) NOT NULL DEFAULT 'AGENDADA',
    conteudo     VARCHAR(1000),
    tarefa_casa  VARCHAR(1000),
    observacoes  VARCHAR(1000),
    criado_em    TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_aula_matricula ON aula(matricula_id);
CREATE INDEX idx_aula_data ON aula(data);

CREATE TABLE frequencia (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aula_id       UUID NOT NULL UNIQUE REFERENCES aula(id) ON DELETE CASCADE,
    status        VARCHAR(20) NOT NULL,
    justificativa VARCHAR(500),
    registrado_em TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE anexo_aula (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aula_id       UUID NOT NULL REFERENCES aula(id) ON DELETE CASCADE,
    nome_arquivo  VARCHAR(255) NOT NULL,
    storage_path  VARCHAR(500) NOT NULL,
    content_type  VARCHAR(120),
    tamanho_bytes BIGINT,
    criado_em     TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE material (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    professor_id  UUID NOT NULL REFERENCES professor(id),
    aluno_id      UUID NOT NULL REFERENCES aluno(id),
    titulo        VARCHAR(150) NOT NULL,
    descricao     VARCHAR(500),
    nome_arquivo  VARCHAR(255) NOT NULL,
    storage_path  VARCHAR(500) NOT NULL,
    content_type  VARCHAR(120),
    tamanho_bytes BIGINT,
    criado_em     TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_material_aluno ON material(aluno_id);
