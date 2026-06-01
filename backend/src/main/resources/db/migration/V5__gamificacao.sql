CREATE TABLE pratica (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aluno_id       UUID NOT NULL REFERENCES aluno(id),
    instrumento_id UUID REFERENCES instrumento(id),
    data           DATE NOT NULL,
    duracao_min    INT NOT NULL,
    observacao     VARCHAR(500),
    xp_ganho       INT NOT NULL DEFAULT 0,
    criado_em      TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_pratica_aluno ON pratica(aluno_id);

CREATE TABLE progresso (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aluno_id                UUID NOT NULL UNIQUE REFERENCES aluno(id) ON DELETE CASCADE,
    xp_total                INT NOT NULL DEFAULT 0,
    nivel                   INT NOT NULL DEFAULT 1,
    sequencia_dias          INT NOT NULL DEFAULT 0,
    ultima_pratica          DATE,
    tempo_pratica_total_min INT NOT NULL DEFAULT 0,
    atualizado_em           TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE meta (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aluno_id                 UUID NOT NULL REFERENCES aluno(id),
    criado_por_professor_id  UUID REFERENCES professor(id),
    titulo                   VARCHAR(150) NOT NULL,
    descricao                VARCHAR(500),
    tipo                     VARCHAR(30) NOT NULL,
    alvo                     INT NOT NULL,
    progresso_atual          INT NOT NULL DEFAULT 0,
    status                   VARCHAR(20) NOT NULL DEFAULT 'ATIVA',
    prazo                    DATE,
    criado_em                TIMESTAMP NOT NULL DEFAULT now(),
    concluida_em             TIMESTAMP
);
CREATE INDEX idx_meta_aluno ON meta(aluno_id);
