ALTER TABLE practice ADD COLUMN lesson_id UUID REFERENCES lesson(id) ON DELETE SET NULL;
CREATE INDEX idx_practice_lesson ON practice(lesson_id);
