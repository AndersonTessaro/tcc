CREATE TABLE notification (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth_user(id) ON DELETE CASCADE,
    type VARCHAR(40) NOT NULL,
    title VARCHAR(120) NOT NULL,
    body VARCHAR(500) NOT NULL,
    student_id UUID REFERENCES student(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES lesson(id) ON DELETE CASCADE,
    practice_id UUID REFERENCES practice(id) ON DELETE CASCADE,
    dedupe_key VARCHAR(120),
    read_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE (user_id, dedupe_key)
);

CREATE INDEX idx_notification_user_created ON notification(user_id, created_at DESC);
CREATE INDEX idx_notification_unread ON notification(user_id) WHERE read_at IS NULL;
