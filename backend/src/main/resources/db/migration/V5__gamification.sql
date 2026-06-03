CREATE TABLE practice (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id    UUID NOT NULL REFERENCES student(id),
    instrument_id UUID REFERENCES instrument(id),
    date          DATE NOT NULL,
    duration_min  INT NOT NULL,
    notes         VARCHAR(500),
    xp_earned     INT NOT NULL DEFAULT 0,
    created_at    TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_practice_student ON practice(student_id);

CREATE TABLE progress (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id          UUID NOT NULL UNIQUE REFERENCES student(id) ON DELETE CASCADE,
    xp_total            INT NOT NULL DEFAULT 0,
    level               INT NOT NULL DEFAULT 1,
    streak_days         INT NOT NULL DEFAULT 0,
    last_practice       DATE,
    total_practice_min  INT NOT NULL DEFAULT 0,
    updated_at          TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE goal (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id         UUID NOT NULL REFERENCES student(id),
    created_by_teacher_id UUID REFERENCES teacher(id),
    title              VARCHAR(150) NOT NULL,
    description        VARCHAR(500),
    type               VARCHAR(30) NOT NULL,
    target             INT NOT NULL,
    current_progress   INT NOT NULL DEFAULT 0,
    status             VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    deadline           DATE,
    created_at         TIMESTAMP NOT NULL DEFAULT now(),
    completed_at       TIMESTAMP
);
CREATE INDEX idx_goal_student ON goal(student_id);
