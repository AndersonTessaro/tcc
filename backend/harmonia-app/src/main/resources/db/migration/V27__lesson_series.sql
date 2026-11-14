ALTER TABLE lesson ADD COLUMN series_id UUID;

CREATE INDEX idx_lesson_series_id ON lesson (series_id);
