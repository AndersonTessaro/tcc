INSERT INTO auth_permission(name, description) VALUES
  ('finance.read.own', 'Read monthly fees of the current teacher active enrollments');

INSERT INTO auth_role_permissions(role_id, permission_id)
SELECT r.id, p.id FROM auth_role r, auth_permission p
WHERE r.name IN ('TEACHER', 'ADMIN') AND p.name = 'finance.read.own';
