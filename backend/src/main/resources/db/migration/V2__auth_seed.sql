-- Roles
INSERT INTO auth_role(name, description) VALUES
  ('ADMIN','Full system access'),
  ('TEACHER','School teacher'),
  ('STUDENT','School student');

-- Permissions (catalog domain.action)
INSERT INTO auth_permission(name, description) VALUES
  ('auth.user.manage','Manage users'),
  ('auth.role.manage','Manage roles'),
  ('auth.permission.manage','Manage permissions'),
  ('student.read','Read students'), ('student.manage','Manage students'),
  ('teacher.read','Read teachers'), ('teacher.manage','Manage teachers'),
  ('enrollment.manage','Manage enrollments'),
  ('instrument.manage','Manage instruments'),
  ('classgroup.manage','Manage class groups'),
  ('lesson.read','Read lessons'), ('lesson.manage','Manage lessons'),
  ('attendance.manage','Register attendance'),
  ('material.read','Read materials'), ('material.manage','Manage materials'),
  ('goal.read','Read goals'), ('goal.manage','Manage goals'),
  ('practice.register','Register practice'),
  ('progress.read','Read progress'),
  ('finance.manage','Manage finance'),
  ('report.read','Read reports'),
  ('config.manage','Manage settings');

-- ADMIN: all
INSERT INTO auth_role_permissions(role_id, permission_id)
SELECT (SELECT id FROM auth_role WHERE name='ADMIN'), p.id FROM auth_permission p;

-- TEACHER
INSERT INTO auth_role_permissions(role_id, permission_id)
SELECT (SELECT id FROM auth_role WHERE name='TEACHER'), p.id FROM auth_permission p
WHERE p.name IN ('student.read','lesson.read','lesson.manage','attendance.manage',
                 'material.read','material.manage','goal.read','goal.manage','report.read');

-- STUDENT
INSERT INTO auth_role_permissions(role_id, permission_id)
SELECT (SELECT id FROM auth_role WHERE name='STUDENT'), p.id FROM auth_permission p
WHERE p.name IN ('lesson.read','material.read','goal.read','goal.manage',
                 'practice.register','progress.read');

-- Initial admin user (password: Admin@123 — CHANGE in prod). BCrypt $2b$10 hash.
INSERT INTO auth_user(username, email, password, display_name, active, email_verified)
VALUES ('admin','admin@harmonia.local',
        '$2b$10$O/1yJudtTLyIFn1lf641fOdQBn7jq4GX1FQyDYAXU4C8Ts74hAD2q',
        'Administrator', TRUE, TRUE);
INSERT INTO auth_user_roles(user_id, role_id)
SELECT u.id, r.id FROM auth_user u, auth_role r WHERE u.username='admin' AND r.name='ADMIN';
