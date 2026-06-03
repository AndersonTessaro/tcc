# Glossário PT → EN (nomes de código)

Regra: **todo o código em inglês**; só texto de tela fica em português.
Este é o dicionário canônico — usar SEMPRE estes nomes ao criar/renomear código.

## Entidades / domínio
| PT | EN |
|----|----|
| Usuario | User |
| Aluno | Student |
| Professor | Teacher |
| Administrador | Administrator (sem classe; User c/ role ADMIN) |
| Instrumento | Instrument |
| Matricula | Enrollment |
| Turma | ClassGroup |
| Aula | Lesson |
| Frequencia | Attendance |
| Reposicao | MakeupLesson |
| AnexoAula | LessonAttachment |
| Material | Material |
| Pratica | Practice |
| Progresso | Progress |
| Meta | Goal |
| Horario | Schedule |
| MovimentacaoFinanceira | FinancialTransaction |
| Configuracao | Setting |
| Relatorio | Report |

## Enums / status
| PT | EN |
|----|----|
| AulaStatus | LessonStatus |
| FrequenciaStatus (PRESENTE/FALTA/JUSTIFICADA) | AttendanceStatus (PRESENT/ABSENT/EXCUSED) |
| MatriculaStatus (ATIVA/INATIVA) | EnrollmentStatus (ACTIVE/INACTIVE) |
| MetaStatus (ATIVA/CONCLUIDA) | GoalStatus (ACTIVE/COMPLETED) |
| MetaTipo | GoalType |

## Roles
| PT | EN |
|----|----|
| ALUNO | STUDENT |
| PROFESSOR | TEACHER |
| ADMIN | ADMIN |

## Permissões (`domain.action`)
| PT | EN |
|----|----|
| aluno.read / aluno.manage | student.read / student.manage |
| professor.read / professor.manage | teacher.read / teacher.manage |
| matricula.manage | enrollment.manage |
| instrumento.manage | instrument.manage |
| turma.manage | classgroup.manage |
| aula.read / aula.manage | lesson.read / lesson.manage |
| frequencia.manage | attendance.manage |
| material.read / material.manage | material.read / material.manage |
| meta.read / meta.manage | goal.read / goal.manage |
| pratica.register | practice.register |
| progresso.read | progress.read |
| financeiro.manage | finance.manage |
| relatorio.read | report.read |
| auth.* / config.manage | (já EN) |

## Pacotes Java
| PT | EN |
|----|----|
| application/aula | application/lesson |
| application/contexto | application/context |
| application/gamificacao | application/gamification |
| application/perfil | application/profile |
| application/professor | application/teacher |
| domain/comum | domain/common |
| domain/gamificacao | domain/gamification |
| infrastructure/persistence/perfil | infrastructure/persistence/profile |
| presentation/aluno | presentation/student |
| presentation/professor | presentation/teacher |

## Use cases / serviços
| PT | EN |
|----|----|
| AdminCadastroUseCase | AdminRegistrationUseCase |
| AlunoAulaUseCase | StudentLessonUseCase |
| ProfessorAulaUseCase | TeacherLessonUseCase |
| FrequenciaUseCase | AttendanceUseCase |
| MetaUseCase | GoalUseCase |
| PraticaUseCase | PracticeUseCase |
| ProgressoUseCase | ProgressUseCase |
| AlunoMaterialUseCase | StudentMaterialUseCase |
| ProfessorMaterialUseCase | TeacherMaterialUseCase |
| ProfessorUseCase | TeacherUseCase |
| GamificacaoService | GamificationService |
| CurrentUserService | CurrentUserService |

## Repositórios (ports)
Sufixo `Repository`. Aluno→Student, Professor→Teacher, Aula→Lesson, Frequencia→Attendance,
Meta→Goal, Pratica→Practice, Progresso→Progress, Matricula→Enrollment, Instrumento→Instrument,
Turma→ClassGroup, Usuario→User, AnexoAula→LessonAttachment.

## Endpoints REST
| PT | EN |
|----|----|
| /me/aulas | /me/lessons |
| /me/materiais | /me/materials |
| /me/praticas | /me/practices |
| /me/progresso | /me/progress |
| /me/metas | /me/goals |
| /me/dashboard | /me/dashboard |
| /professor/** | /teacher/** |
| /professor/alunos | /teacher/students |
| /professor/aulas/{id}/frequencia | /teacher/lessons/{id}/attendance |
| /professor/agenda | /teacher/schedule |
| /professor/relatorios | /teacher/reports |
| /admin/alunos | /admin/students |
| /admin/professores | /admin/teachers |
| /admin/instrumentos | /admin/instruments |
| /admin/matriculas | /admin/enrollments |
| /admin/security/usuarios | /admin/security/users |
| /admin/security/permissoes | /admin/security/permissions |
| .../senha | .../password |

## Query params / campos JSON
| PT | EN |
|----|----|
| status=proximas / passadas | status=upcoming / past |
| status=ATIVA / CONCLUIDA | status=ACTIVE / COMPLETED |
| nivel | level |
| xp / xpTotal / xpGanho | xp / xpTotal / xpEarned |
| sequenciaDias | streakDays |
| praticaSemanalMin | weeklyPracticeMin |
| proximaAula | nextLesson |
| duracaoMin | durationMin |
| observacao | notes |
| titulo | title |
| descricao | description |
| alvo | target |
| tipo | type |
| busca | search |
| data | date |
| horaInicio / horaFim | startTime / endTime |
| conteudo | content |
| tarefaCasa | homework |
| justificativa | justification |
| login / senha | login / password |
| nome | name |
| ativo | active |

## Tabelas / colunas do banco (snake_case)
Tabelas: `auth_user`, `auth_role`, `auth_permission`, `auth_user_roles`, `auth_role_permissions`,
`refresh_token`, `password_reset_token`, `student`, `teacher`, `instrument`, `teacher_instrument`,
`class_group`, `enrollment`, `lesson`, `attendance`, `lesson_attachment`, `material`, `practice`,
`progress`, `goal`.

Colunas comuns: `user_id`, `student_id`, `teacher_id`, `instrument_id`, `enrollment_id`,
`lesson_id`, `created_at`, `active`, `display_name`, `email_verified`, `start_time`, `end_time`,
`content`, `homework`, `duration_min`, `xp_earned`, `xp_total`, `level`, `streak_days`,
`total_minutes`, `title`, `description`, `target`, `type`, `status`.
