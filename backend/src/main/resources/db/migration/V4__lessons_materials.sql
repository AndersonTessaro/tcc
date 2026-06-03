CREATE TABLE lesson (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id UUID NOT NULL REFERENCES enrollment(id),
    date          DATE NOT NULL,
    start_time    TIME NOT NULL,
    end_time      TIME,
    status        VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED',
    content       VARCHAR(1000),
    homework      VARCHAR(1000),
    notes         VARCHAR(1000),
    created_at    TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_lesson_enrollment ON lesson(enrollment_id);
CREATE INDEX idx_lesson_date ON lesson(date);

CREATE TABLE attendance (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id     UUID NOT NULL UNIQUE REFERENCES lesson(id) ON DELETE CASCADE,
    status        VARCHAR(20) NOT NULL,
    justification VARCHAR(500),
    registered_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE lesson_attachment (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id    UUID NOT NULL REFERENCES lesson(id) ON DELETE CASCADE,
    file_name    VARCHAR(255) NOT NULL,
    storage_path VARCHAR(500) NOT NULL,
    content_type VARCHAR(120),
    size_bytes   BIGINT,
    created_at   TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE material (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id   UUID NOT NULL REFERENCES teacher(id),
    student_id   UUID NOT NULL REFERENCES student(id),
    title        VARCHAR(150) NOT NULL,
    description  VARCHAR(500),
    file_name    VARCHAR(255) NOT NULL,
    storage_path VARCHAR(500) NOT NULL,
    content_type VARCHAR(120),
    size_bytes   BIGINT,
    created_at   TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_material_student ON material(student_id);
