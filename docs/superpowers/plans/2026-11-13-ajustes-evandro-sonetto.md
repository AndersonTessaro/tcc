# Ajustes finais pedidos pelo Evandro (12–13/11/2026)

Origem: WhatsApp do Evandro, 12/11 21:01 a 13/11 20:16 — 3 textos, 8 prints e 6 áudios (transcritos com
faster-whisper `medium`). Ajustes saíram da orientação de 12/11. Prazo pedido: **quinta, 19/11**.
Uso: testadores externos e apresentação na banca.

## 1. Pedidos mapeados

| # | Pedido | Fonte | Onde bate no código | Tamanho |
|---|--------|-------|---------------------|---------|
| 1 | PWA instalável | áudio 12/11 10:10 e 21:05 | — | ✅ feito (`8026df4`) |
| 2 | Trocar "Harmonia" por "Sonetto" em tudo que aparece | áudio + prints 4 e 5 | `web/src/components/layout/AppLayout.tsx`, `AuthShell.tsx`, `web/index.html`, `mobile/public/manifest.json`, `mobile/src/app/+html.tsx`, `_layout.tsx`, `app.json`, escola seed "Escola Harmonia" (V25), e-mails | P |
| 3 | Logo no topo do site (hoje é um raio genérico) | áudio + print 4 | `AppLayout.tsx`, `AuthShell.tsx`, `web/public/favicon.svg` | P |
| 4 | Apagar instrumento (admin e gestor) — hoje só cadastra; há lixo "Piano 1790115423972" | áudio + print 1 | `AdminController` (só `GET`/`POST /admin/instruments`), página Instrumentos do web | P |
| 5 | Teclado do APK cobre o campo que está sendo digitado | áudio + print 3 | 8 telas com `KeyboardAvoidingView behavior={undefined}` no Android | P |
| 6 | Foto de perfil recusada acima de 2 MB — comprimir em vez de recusar | áudio + print 2 | `features/account/ProfilePhoto.tsx`, `avatarService.ts` | P |
| 7 | Professor não consegue anexar foto nem vídeo na aula (aluno na prática não foi testado) | áudio + texto | `features/teacher/LessonAttachmentList.tsx` (só `DocumentPicker`), `FileSignatures` no backend | M (investigar) |
| 8 | "Nova aula" só agenda: tirar Situação/Frequência, Conteúdo, Tarefa e Anexos | áudio + print 8 + texto | `features/teacher/LessonFormScreen.tsx` (464 linhas) | M |
| 9 | Na Agenda, cada aula ganha botões **Conteúdo** (o que foi trabalhado) e **Prática** (o que o aluno deve praticar) | áudio + prints 6 e 7 | `app/teacher/(tabs)/schedule.tsx`, `PUT /teacher/lessons/{id}` | M |
| 10 | Aula única, semanal, quinzenal ou mensal | áudio + texto | `POST /teacher/lessons`, `lesson-core` (`SchedulingPolicy`), nova migration | M |
| 11 | Menu de chat professor ↔ aluno | áudio + texto | não existe — backend, mobile professor e aluno | G |
| 12 | "Omitir informações desnecessárias" no cadastro de aula | texto | sai junto do item 8 | — |

Causa provável já vista:
- **#5** — Expo SDK 56 força edge-to-edge no Android; `adjustResize` do manifest deixa de redimensionar a
  janela, e as telas passam `behavior={undefined}` no Android. Nada empurra o conteúdo.
- **#7** — anexos de aula só abrem o seletor de documentos; foto/vídeo da galeria não tem atalho
  (a prática do aluno já usa `expo-image-picker`). Falta confirmar se o envio também falha por
  assinatura (HEIC, 3GP, MOV) ou por tempo.
- **#4** — os instrumentos com número são sobra de E2E rodado contra a base publicada.

## 2. Decisões assumidas (mudar aqui se o Evandro discordar)

1. **Gestor apaga instrumento?** Instrumento é global, vale para todas as escolas. Assumido: só `ADMIN`
   apaga; gestor continua sem mexer. Instrumento com matrícula → 409, não apaga.
2. **Recorrência gera aulas reais**, não regra virtual: o professor escolhe a repetição e a data final
   (padrão 3 meses, máximo 12). Cada aula passa pela checagem de conflito; se uma data conflita, nada é
   criado e a resposta lista as datas. "Horários fixos" (Mais → Horários) continua como está.
3. **Conteúdo e Prática** reutilizam os campos `content` e `homework` que já existem; anexos ficam dentro
   de "Conteúdo". "Editar" na agenda passa a mexer só em data e hora.
4. **Frequência** some do cadastro e fica só no card da agenda (já existe lá).
5. **Chat** só texto, 1 conversa por par professor↔aluno com matrícula ativa, atualização por polling
   de 5 s com a tela aberta. Sem push, sem anexo, sem grupo.
6. **Renomear** só o que o usuário vê. Pacote Java `br.com.harmonia`, nomes de recurso no Azure e URLs
   ficam como estão.

## 3. Quem faz o quê

Regra: Codex recebe tarefa fechada, com arquivos, contrato e teste de aceite escritos. Claude fica com o
que exige investigar, decidir ou olhar a tela, e revisa todo diff do Codex antes de aceitar.

| Etapa | Itens | Executor | Por quê |
|-------|-------|----------|---------|
| A | #2 renomear, #3 logo | Codex | mecânico, lista de arquivos conhecida |
| B | #4 apagar instrumento (endpoint + IT + botão no web) | Codex | CRUD com contrato fechado |
| C | #5 teclado | Codex | mesma troca em 8 telas |
| D | #6 comprimir foto | Codex | escopo de 2 arquivos |
| E | #7 anexos foto/vídeo | **Claude** | precisa reproduzir e achar a causa antes de mexer |
| F | #8, #9 fluxo da aula | **Claude** | redesenho de tela, depende de ver o resultado |
| G | #10 recorrência — backend | Codex | regra bem especificada, testável sem tela |
| G' | #10 recorrência — tela | **Claude** | encaixa no formulário da etapa F |
| H | #11 chat — backend | Codex | tabela + 6 rotas + IT de ownership |
| H' | #11 chat — mobile | Codex, depois **Claude** ajusta | tela nova seguindo `src/ui/` |
| I | verificação, deploy, APK | **Claude** | garantia da entrega |

Ordem: A–D em paralelo (arquivos disjuntos) → E → F → G/G' → H/H' → I.
A, B, C, D, G e H não tocam os mesmos arquivos, então rodam em paralelo no Codex enquanto E e F andam.

## 4. Especificação por etapa

### A — Sonetto + logo (Codex)
- Trocar o texto visível "Harmonia" por "Sonetto" nos arquivos da tabela; título do web
  "Sonetto — Administração"; manifest `name: "Sonetto — Gestão Musical"`, `short_name: "Sonetto"`.
- `app.json`: `name: "Sonetto"` (slug e package ficam).
- Nova migration `V26`: `UPDATE school SET name = 'Escola Sonetto' WHERE name = 'Escola Harmonia'`.
- Logo do web: nota musical (mesma do login do app, `mobile/assets/images/figma-student/login-logo.png`)
  sobre `#34146D`, no lugar do raio em `AppLayout`/`AuthShell`; favicon igual.
- Aceite: `grep -ri harmonia` em `web/src`, `web/index.html`, `mobile/src`, `mobile/public` só devolve
  identificador de código; testes de web e mobile verdes.

### B — Apagar instrumento (Codex)
- `DELETE /admin/instruments/{id}` — `hasRole('ADMIN')`. 404 se não existe; 409 `RESOURCE_IN_USE` se há
  matrícula; remove `teacher_instrument` junto.
- Web: botão de lixeira na linha, com confirmação; erro 409 traduzido em `apiErrorMessage`.
- IT: apaga livre, 409 com matrícula, 403 para gestor e professor, 404.
- Depois do deploy: apagar pela tela os "Piano/Violino 179…" da base publicada.

### C — Teclado (Codex)
- Um componente `src/ui/KeyboardScreen.tsx` com `behavior="padding"` nas duas plataformas, usado nas 8
  telas listadas (login primeiro). Sem dependência nova.
- Aceite: jest verde; conferência no APK (login e formulário de aula).

### D — Foto de perfil (Codex)
- Escolher com `expo-image-picker` (já instalado) e reduzir para 512×512 JPEG com
  `expo-image-manipulator` (dependência nova, mesma família do Expo — única do plano).
- Sai o aviso "até 2 MB"; o limite do backend continua como defesa.
- Aceite: teste unitário do serviço; envio de uma foto de câmera (>5 MB) no APK e no PWA.

### E — Anexos de foto e vídeo (Claude)
1. Reproduzir no PWA e no emulador com JPEG, HEIC, MP4 e MOV; registrar status e corpo da resposta.
2. Corrigir a causa (assinatura aceita, MIME vazio do seletor, tempo de envio — o que aparecer).
3. Acrescentar "Foto ou vídeo da galeria" ao lado de "Arquivo", igual ao `PracticeRecordingPicker`.
4. Repetir o teste no fluxo de prática do aluno.
- Aceite: IT novo para cada formato corrigido; E2E Playwright anexando imagem e vídeo.

### F — Fluxo da aula (Claude)
- `LessonFormScreen` em criação: Aluno → Quando → Repetição. Em edição: só data e hora.
- Card da agenda: `Conteúdo` abre folha com "Conteúdo trabalhado" + anexos; `Prática` abre folha com
  "O que o aluno deve praticar". Os dois salvam por `PUT /teacher/lessons/{id}`.
- Backend: conferir que `POST /teacher/lessons` aceita criar sem conteúdo/tarefa/frequência.
- Aceite: testes de `LessonFormScreen` atualizados; E2E `manager-teacher-video-flow` ajustado à nova
  ordem; print antes/depois para mandar ao Evandro.

### G — Recorrência (Codex backend, Claude tela)
- `POST /teacher/lessons` ganha `recurrence: NONE | WEEKLY | BIWEEKLY | MONTHLY` e `repeatUntil`.
- Geração das datas em `lesson-core` (puro, com teste): mensal mantém o dia do mês e cai no último dia
  quando o mês é mais curto; máximo 12 meses.
- `V27`: `lesson.series_id UUID NULL`. Tudo numa transação; conflito → 409 `SCHEDULE_CONFLICT` com as
  datas.
- Tela: chips Única / Semanal / Quinzenal / Mensal + "Repetir até".
- Aceite: testes unitários das datas, IT de criação em série e de conflito sem criação parcial.

### H — Chat (Codex, revisão e ajuste do Claude)
- `V28` `chat_message(id, teacher_id, student_id, sender_user_id, body, created_at, read_at)`.
- Professor: `GET /teacher/chats`, `GET|POST /teacher/chats/{studentId}/messages`.
  Aluno: `GET /me/chats`, `GET|POST /me/chats/{teacherId}/messages`.
- Sem matrícula ativa entre os dois → 404. Corpo 1–2000 caracteres. Ler a conversa marca como lida.
- Permissões `chat.read`/`chat.write` para `STUDENT` e `TEACHER`.
- Mobile: item "Chat" no Mais (professor e aluno), lista de conversas com não lidas, tela de conversa
  com polling de 5 s só enquanto aberta.
- Aceite: IT de ownership (outro professor, outro aluno, matrícula encerrada); jest das telas; E2E
  professor envia, aluno lê e responde.

### I — Verificação e entrega (Claude)
Para cada diff do Codex, antes de aceitar:
1. Ler o diff inteiro; conferir escopo (nada fora dos arquivos pedidos) e as convenções do `CLAUDE.md`.
2. Rodar: `./mvnw verify` · `npx jest && npx tsc --noEmit` (mobile) · `npm test && npm run build` (web).
3. Revisão de segurança nos itens B e H (autorização e ownership).

No fim:
- E2E Playwright de mobile e web contra backend local.
- Teste manual no PWA publicado, logado como professor e como aluno, nos 11 itens.
- Commit por etapa na `main`; o CI publica api, web e app.
- APK novo (teclado, foto e nome mudam o nativo) e link do PWA para o Evandro, com a lista do que mudou.

## 5. Riscos

- **Chat é o item grande.** Se o prazo apertar, entra por último e pode ir sem contador de não lidas.
- **Anexos**: causa ainda não confirmada; o tamanho pode crescer depois de reproduzir.
- **APK**: mudança nativa exige build novo; o PWA atualiza sozinho pelo CI.
- **Base publicada**: três migrations novas (V26–V28) rodam no Postgres do Azure no próximo deploy.
