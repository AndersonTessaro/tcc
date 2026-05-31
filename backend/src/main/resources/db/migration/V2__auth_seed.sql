-- Roles
INSERT INTO auth_role(name, description) VALUES
  ('ADMIN','Acesso completo ao sistema'),
  ('PROFESSOR','Professor da escola'),
  ('ALUNO','Aluno da escola');

-- Permissions (catálogo dominio.acao)
INSERT INTO auth_permission(name, description) VALUES
  ('auth.user.manage','Gerenciar usuários'),
  ('auth.role.manage','Gerenciar roles'),
  ('auth.permission.manage','Gerenciar permissões'),
  ('aluno.read','Ler alunos'), ('aluno.manage','Gerenciar alunos'),
  ('professor.read','Ler professores'), ('professor.manage','Gerenciar professores'),
  ('matricula.manage','Gerenciar matrículas'),
  ('instrumento.manage','Gerenciar instrumentos'),
  ('turma.manage','Gerenciar turmas'),
  ('aula.read','Ler aulas'), ('aula.manage','Gerenciar aulas'),
  ('frequencia.manage','Registrar frequência'),
  ('material.read','Ler materiais'), ('material.manage','Gerenciar materiais'),
  ('meta.read','Ler metas'), ('meta.manage','Gerenciar metas'),
  ('pratica.register','Registrar prática'),
  ('progresso.read','Ler progresso'),
  ('financeiro.manage','Gerenciar financeiro'),
  ('relatorio.read','Ler relatórios'),
  ('config.manage','Gerenciar configurações');

-- ADMIN: todas
INSERT INTO auth_role_permissions(role_id, permissions_id)
SELECT (SELECT id FROM auth_role WHERE name='ADMIN'), p.id FROM auth_permission p;

-- PROFESSOR
INSERT INTO auth_role_permissions(role_id, permissions_id)
SELECT (SELECT id FROM auth_role WHERE name='PROFESSOR'), p.id FROM auth_permission p
WHERE p.name IN ('aluno.read','aula.read','aula.manage','frequencia.manage',
                 'material.read','material.manage','meta.read','meta.manage','relatorio.read');

-- ALUNO
INSERT INTO auth_role_permissions(role_id, permissions_id)
SELECT (SELECT id FROM auth_role WHERE name='ALUNO'), p.id FROM auth_permission p
WHERE p.name IN ('aula.read','material.read','meta.read','meta.manage',
                 'pratica.register','progresso.read');

-- Usuário admin inicial (senha: Admin@123 — TROCAR em prod). Hash BCrypt $2b$10.
INSERT INTO auth_user(username, email, password, display_name, ativo, email_verified)
VALUES ('admin','admin@harmonia.local',
        '$2b$10$O/1yJudtTLyIFn1lf641fOdQBn7jq4GX1FQyDYAXU4C8Ts74hAD2q',
        'Administrador', TRUE, TRUE);
INSERT INTO auth_user_roles(user_id, roles_id)
SELECT u.id, r.id FROM auth_user u, auth_role r WHERE u.username='admin' AND r.name='ADMIN';
