CREATE TABLE school (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(120) NOT NULL UNIQUE,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

INSERT INTO school(name) VALUES ('Escola Harmonia');

ALTER TABLE auth_user ADD COLUMN school_id UUID REFERENCES school(id) ON DELETE CASCADE;
UPDATE auth_user u SET school_id = (SELECT id FROM school WHERE name = 'Escola Harmonia')
WHERE NOT EXISTS (
    SELECT 1 FROM auth_user_roles ur JOIN auth_role r ON r.id = ur.role_id
    WHERE ur.user_id = u.id AND r.name = 'ADMIN'
);
CREATE INDEX idx_auth_user_school ON auth_user(school_id);

ALTER TABLE financial_transaction ADD COLUMN school_id UUID REFERENCES school(id) ON DELETE CASCADE;
UPDATE financial_transaction SET school_id = (SELECT id FROM school WHERE name = 'Escola Harmonia');
ALTER TABLE financial_transaction ALTER COLUMN school_id SET NOT NULL;
CREATE INDEX idx_financial_transaction_school ON financial_transaction(school_id);

INSERT INTO auth_role(name, description) VALUES ('MANAGER', 'Gestor da escola');
INSERT INTO auth_role_permissions(role_id, permission_id)
SELECT r.id, p.id FROM auth_role r CROSS JOIN auth_permission p
WHERE r.name = 'MANAGER' AND p.name IN (
    'student.read', 'student.manage', 'student.register', 'student.update',
    'teacher.read', 'teacher.manage', 'enrollment.manage', 'lesson.read', 'lesson.manage',
    'attendance.manage', 'report.read', 'finance.manage', 'auth.user.manage'
);

INSERT INTO auth_permission(name, description) VALUES ('school.manage', 'Manage schools');
INSERT INTO auth_role_permissions(role_id, permission_id)
SELECT r.id, p.id FROM auth_role r CROSS JOIN auth_permission p
WHERE r.name = 'ADMIN' AND p.name = 'school.manage';
UPDATE auth_role SET description = 'Administrador do sistema' WHERE name = 'ADMIN';
