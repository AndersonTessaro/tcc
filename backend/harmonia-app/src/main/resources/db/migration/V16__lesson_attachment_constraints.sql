ALTER TABLE lesson_attachment
    ALTER COLUMN content_type SET NOT NULL,
    ALTER COLUMN size_bytes   SET NOT NULL,
    ADD CONSTRAINT ck_lesson_attachment_size CHECK (size_bytes > 0);
CREATE INDEX idx_lesson_attachment_lesson ON lesson_attachment(lesson_id);
