# Painel admin (web) — listagens e ações sobre o que o backend já oferece

Contexto: smoke de 2026-10-16. A página Cadastros só tem formulários; o admin não vê o que cadastrou. Várias
rotas do backend não têm tela. Regras do projeto em `CLAUDE.md` (código em inglês, texto de tela em pt-BR,
Clean Architecture, DTOs de `presentation` não entram em `application`, sem comentários óbvios).

## Backend (`backend/harmonia-app`)
1. `GET /admin/enrollments?status=` (`enrollment.manage`; `status` opcional ACTIVE|SUSPENDED|CLOSED) →
   `[{ id, student: {id,name,username}, teacher: {id,name,username}, instrument: {id,name}, classLabel, status,
   monthlyFee }]`, ordenado por nome do aluno. Use case devolve records próprios ou entidades; o controller mapeia
   para records em `presentation`.
2. `PUT /admin/enrollments/{id}/status` `{ status }` (`enrollment.manage`) → 204. Id inexistente → 404.
   Reativar (→ ACTIVE) quando já existe outra matrícula ACTIVE do mesmo aluno+professor+instrumento → 409
   `DUPLICATE_RESOURCE` (mesma regra da criação).
3. Migration `V20__role_descriptions_pt.sql`: `UPDATE` das descrições das roles seed (ADMIN, TEACHER, STUDENT e
   as demais que existirem — conferir nas migrations) para pt-BR. Não editar migrations antigas.
4. IT em `AdminEnrollmentsIT` (ou estender o IT de admin existente): lista com e sem filtro; troca de status;
   404; 409 na reativação duplicada; professor sem `enrollment.manage` → 403; sem token → 401.

## Web (`web/`)
Quebrar `Registrations.tsx` em páginas com listagem + criação, cada uma no menu lateral:
- **Alunos** `/admin/students`: tabela (nome, usuário) com busca; formulário "Novo aluno" (o atual).
- **Professores** `/admin/teachers`: tabela (nome, usuário, instrumentos) com busca; editar instrumentos na
  própria linha (reusar `TeacherInstrumentsCard`/`InstrumentChecklist`); formulário "Novo professor".
- **Instrumentos** `/admin/instruments`: lista + "Novo instrumento".
- **Matrículas** `/admin/enrollments`: tabela (aluno, professor, turma/instrumento, status, mensalidade em BRL) com
  filtro de status (padrão Ativas) e busca; ações por linha: alterar status (Ativa/Suspensa/Encerrada, com
  confirmação para encerrar) e editar mensalidade (`PUT /admin/enrollments/{id}/fee`); formulário "Nova
  matrícula" ganha campo opcional de mensalidade.
- `/admin/registrations` redireciona para `/admin/students`.
- **Usuários**: busca por nome/usuário/e-mail e filtro por perfil.
- **Perfis de acesso**: formulário "Novo perfil" (`POST /admin/security/roles`, nome + descrição).
- **Financeiro**: campos categoria e data (padrão hoje) no lançamento; data da tabela em dd/mm/aaaa.
- Estados de carregando/vazio/erro em todas as listas; erros via `apiErrorMessage`; selects e inputs com rótulo
  acessível; valores em `Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })`.
- Reusar `@/components/ui`; Tailwind como no resto; sem bibliotecas novas.
- Testes: atualizar `Registrations.integration.test.tsx` para as novas páginas e criar teste de integração de
  Matrículas (lista, filtro, troca de status, mensalidade). `npm test` e `npm run build` verdes.

## Docs
- `CLAUDE.md`: item 20 em "Próximos passos" resumindo endpoints e telas novas.
