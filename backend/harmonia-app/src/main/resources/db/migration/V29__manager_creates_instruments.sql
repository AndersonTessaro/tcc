INSERT INTO auth_role_permissions(role_id, permission_id)
SELECT r.id, p.id FROM auth_role r, auth_permission p
WHERE r.name = 'MANAGER' AND p.name = 'instrument.manage'
ON CONFLICT DO NOTHING;
