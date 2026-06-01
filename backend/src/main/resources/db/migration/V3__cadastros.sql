CREATE TABLE instrumento (
    id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome  VARCHAR(80) NOT NULL UNIQUE,
    ativo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE aluno (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id       UUID NOT NULL UNIQUE REFERENCES auth_user(id) ON DELETE CASCADE,
    data_nascimento  DATE,
    telefone         VARCHAR(20),
    ativo            BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE professor (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id  UUID NOT NULL UNIQUE REFERENCES auth_user(id) ON DELETE CASCADE,
    bio         VARCHAR(500),
    ativo       BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE professor_instrumento (
    professor_id   UUID NOT NULL REFERENCES professor(id) ON DELETE CASCADE,
    instrumento_id UUID NOT NULL REFERENCES instrumento(id) ON DELETE CASCADE,
    PRIMARY KEY (professor_id, instrumento_id)
);

CREATE TABLE turma (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome           VARCHAR(100) NOT NULL,
    professor_id   UUID NOT NULL REFERENCES professor(id),
    instrumento_id UUID REFERENCES instrumento(id),
    ativo          BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE matricula (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aluno_id       UUID NOT NULL REFERENCES aluno(id),
    professor_id   UUID NOT NULL REFERENCES professor(id),
    instrumento_id UUID NOT NULL REFERENCES instrumento(id),
    turma_id       UUID REFERENCES turma(id),
    data_inicio    DATE NOT NULL DEFAULT CURRENT_DATE,
    status         VARCHAR(20) NOT NULL DEFAULT 'ATIVA'
);
CREATE INDEX idx_matricula_aluno ON matricula(aluno_id);
CREATE INDEX idx_matricula_professor ON matricula(professor_id);
