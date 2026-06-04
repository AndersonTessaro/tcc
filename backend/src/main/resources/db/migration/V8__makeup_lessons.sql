CREATE TABLE makeup_lesson (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_lesson_id UUID NOT NULL UNIQUE REFERENCES lesson(id) ON DELETE CASCADE,
    new_lesson_id      UUID NOT NULL UNIQUE REFERENCES lesson(id) ON DELETE CASCADE,
    reason             VARCHAR(500),
    created_at         TIMESTAMP NOT NULL DEFAULT now()
);
