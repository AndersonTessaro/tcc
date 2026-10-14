INSERT INTO auth_permission(name, description) VALUES
  ('student.register', 'Register a student linked to the current teacher'),
  ('student.update',   'Update linked student profile and notes'),
  ('note.read',        'Read notes shared by the student''s teachers');

INSERT INTO auth_role_permissions(role_id, permission_id)
SELECT r.id, p.id FROM auth_role r, auth_permission p
WHERE (r.name IN ('ADMIN', 'TEACHER') AND p.name IN ('student.register', 'student.update'))
   OR (r.name IN ('ADMIN', 'STUDENT') AND p.name = 'note.read');

CREATE TABLE teacher_student_note (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id    UUID NOT NULL REFERENCES teacher(id) ON DELETE CASCADE,
    student_id    UUID NOT NULL REFERENCES student(id) ON DELETE CASCADE,
    private_notes VARCHAR(1000),
    shared_notes  VARCHAR(1000),
    updated_at    TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT uq_teacher_student_note UNIQUE (teacher_id, student_id),
    CONSTRAINT ck_teacher_student_note_not_empty CHECK (private_notes IS NOT NULL OR shared_notes IS NOT NULL)
);
