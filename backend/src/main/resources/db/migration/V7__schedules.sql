CREATE TABLE schedule (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id UUID NOT NULL REFERENCES enrollment(id) ON DELETE CASCADE,
    weekday       VARCHAR(10) NOT NULL,
    start_time    TIME NOT NULL,
    end_time      TIME,
    active        BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE INDEX idx_schedule_enrollment ON schedule(enrollment_id);
