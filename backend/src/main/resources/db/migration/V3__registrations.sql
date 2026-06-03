CREATE TABLE instrument (
    id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name   VARCHAR(80) NOT NULL UNIQUE,
    active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE student (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL UNIQUE REFERENCES auth_user(id) ON DELETE CASCADE,
    birth_date  DATE,
    phone       VARCHAR(20),
    active      BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE teacher (
    id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth_user(id) ON DELETE CASCADE,
    bio     VARCHAR(500),
    active  BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE teacher_instrument (
    teacher_id    UUID NOT NULL REFERENCES teacher(id) ON DELETE CASCADE,
    instrument_id UUID NOT NULL REFERENCES instrument(id) ON DELETE CASCADE,
    PRIMARY KEY (teacher_id, instrument_id)
);

CREATE TABLE class_group (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          VARCHAR(100) NOT NULL,
    teacher_id    UUID NOT NULL REFERENCES teacher(id),
    instrument_id UUID REFERENCES instrument(id),
    active        BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE enrollment (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id    UUID NOT NULL REFERENCES student(id),
    teacher_id    UUID NOT NULL REFERENCES teacher(id),
    instrument_id UUID NOT NULL REFERENCES instrument(id),
    class_group_id UUID REFERENCES class_group(id),
    start_date    DATE NOT NULL DEFAULT CURRENT_DATE,
    status        VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
);
CREATE INDEX idx_enrollment_student ON enrollment(student_id);
CREATE INDEX idx_enrollment_teacher ON enrollment(teacher_id);
