CREATE TABLE chat_message (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id     UUID NOT NULL REFERENCES teacher(id) ON DELETE CASCADE,
    student_id     UUID NOT NULL REFERENCES student(id) ON DELETE CASCADE,
    sender_user_id UUID NOT NULL REFERENCES auth_user(id) ON DELETE CASCADE,
    body           VARCHAR(2000) NOT NULL,
    created_at     TIMESTAMP NOT NULL DEFAULT now(),
    read_at        TIMESTAMP
);

CREATE INDEX idx_chat_message_pair_created ON chat_message(teacher_id, student_id, created_at);

INSERT INTO auth_permission(name, description) VALUES
  ('chat.read', 'Read own teacher-student conversations'),
  ('chat.write', 'Send messages in own teacher-student conversations');

INSERT INTO auth_role_permissions(role_id, permission_id)
SELECT r.id, p.id FROM auth_role r, auth_permission p
WHERE r.name IN ('STUDENT', 'TEACHER', 'ADMIN') AND p.name IN ('chat.read', 'chat.write');
