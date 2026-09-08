-- Lessons and schedules must have a real interval so overlap detection is reliable (lesson-core TimeRange).
-- Rows created before this migration may have no end time; give them the default one-hour duration first, clamped so it never wraps past midnight.
UPDATE lesson
SET end_time = CASE
        WHEN start_time < TIME '22:59:59' THEN start_time + INTERVAL '1 hour'
        ELSE TIME '23:59:59'
    END
WHERE end_time IS NULL OR end_time <= start_time;

UPDATE schedule
SET end_time = CASE
        WHEN start_time < TIME '22:59:59' THEN start_time + INTERVAL '1 hour'
        ELSE TIME '23:59:59'
    END
WHERE end_time IS NULL OR end_time <= start_time;

ALTER TABLE lesson
    ALTER COLUMN end_time SET NOT NULL,
    ADD CONSTRAINT chk_lesson_valid_time_range CHECK (end_time > start_time);

ALTER TABLE schedule
    ALTER COLUMN end_time SET NOT NULL,
    ADD CONSTRAINT chk_schedule_valid_time_range CHECK (end_time > start_time);
