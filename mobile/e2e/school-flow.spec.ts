import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const API = process.env.E2E_API_URL ?? "http://localhost:8080";
const ADMIN = { login: process.env.E2E_ADMIN_LOGIN ?? "admin", password: process.env.E2E_ADMIN_PASSWORD ?? "Admin@123" };
const PASSWORD = "Senha@123";

const run = `e2e${Date.now().toString(36)}`;
const teacher = { name: `Prof ${run}`, username: `prof${run}`, email: `prof${run}@e2e.test` };
const student = { name: `Aluna ${run}`, username: `aluna${run}`, email: `aluna${run}@e2e.test` };
const instrument = `Violino ${run}`;
const lesson = { content: `Escala de Sol ${run}`, homework: `Arco longo 15 min ${run}` };
const notes = { shared: `Foque na afinação ${run}`, privateNote: `Só para o professor ${run}` };

function isoDate(daysFromToday: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function post(request: APIRequestContext, path: string, token: string, data: object): Promise<{ id: string }> {
  const res = await request.post(`${API}${path}`, { data, headers: { Authorization: `Bearer ${token}` } });
  expect(res.ok(), `${path} -> ${res.status()} ${await res.text()}`).toBeTruthy();
  return res.json();
}

async function login(page: Page, user: string, password = PASSWORD) {
  await page.goto("/login");
  await page.getByRole("textbox", { name: "E-mail ou usuário" }).fill(user);
  await page.getByRole("textbox", { name: "Senha" }).fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).not.toHaveURL(/login/);
}

test.describe.serial("Fluxo da escola: professor e aluno", () => {
  test.beforeAll(async ({ request }) => {
    const auth = await request.post(`${API}/auth/login`, { data: ADMIN });
    expect(auth.ok(), "admin login — backend no ar e seed do admin?").toBeTruthy();
    const { accessToken } = await auth.json();
    const { id: instrumentId } = await post(request, "/admin/instruments", accessToken, { name: instrument });
    const { id: teacherId } = await post(request, "/admin/teachers", accessToken,
      { ...teacher, password: PASSWORD, instrumentIds: [instrumentId] });
    const { id: studentId } = await post(request, "/admin/students", accessToken, { ...student, password: PASSWORD });
    await post(request, "/admin/enrollments", accessToken, { studentId, teacherId, instrumentId, monthlyFee: 200 });
  });

  test("login valida campos vazios e senha errada", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.getByText("Informe seu e-mail ou usuário.")).toBeVisible();
    await expect(page.getByText("Informe sua senha.")).toBeVisible();

    await page.getByRole("textbox", { name: "E-mail ou usuário" }).fill(teacher.username);
    await page.getByRole("textbox", { name: "Senha" }).fill("senha-errada");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.getByRole("alert")).toHaveText("Login ou senha inválidos");
    await expect(page).toHaveURL(/login/);
  });

  test("professor agenda aula para amanhã com conteúdo e tarefa", async ({ page }) => {
    await login(page, teacher.username);
    await expect(page).toHaveURL(/teacher\/dashboard/);
    await expect(page.getByRole("heading", { name: "Olá, Prof!" })).toBeVisible();
    await expect(page.getByLabel("Frequência média: —")).toBeVisible();
    await page.getByRole("tab", { name: "Aulas" }).click();
    await page.getByRole("button", { name: "Nova aula" }).first().click();
    await expect(page.getByRole("heading", { name: "Nova aula" })).toBeVisible();

    await page.getByRole("radio", { name: new RegExp(student.name) }).click();
    await page.getByRole("textbox", { name: "Data" }).fill(isoDate(1));
    await page.getByRole("textbox", { name: "Início" }).fill("15:00");
    await page.getByRole("textbox", { name: "Conteúdo trabalhado" }).fill(lesson.content);
    await page.getByRole("textbox", { name: "Tarefa para casa" }).fill(lesson.homework);
    await expect(page.getByText("Horário livre")).toBeVisible();
    await expect(page.getByText(/a aula nasce agendada/)).toBeVisible();
    await page.getByRole("button", { name: /Agendar aula/ }).click();

    await expect(page).toHaveURL(/teacher\/schedule/);
    await expect(page.getByText("Aula agendada", { exact: true })).toBeVisible();

    const [y, m, d] = isoDate(1).split("-");
    if (d === "01") await page.getByRole("button", { name: "Próximo mês" }).click();
    await page.getByRole("button", { name: new RegExp(`^${d}/${m}/${y}`) }).click();
    await expect(page.getByText(`Conteúdo: ${lesson.content}`)).toBeVisible();
    await expect(page.getByText(`Tarefa: ${lesson.homework}`)).toBeVisible();
  });

  test("aula repetida no mesmo horário é recusada", async ({ page }) => {
    await login(page, teacher.username);
    await page.goto(`/teacher/new-lesson?date=${isoDate(1)}`);
    await page.getByRole("radio", { name: new RegExp(student.name) }).click();
    await page.getByRole("textbox", { name: "Início" }).fill("15:30");
    await expect(page.getByText(/conflito|Conflito|ocupado/).first()).toBeVisible();
  });

  test("aluno vê a aula agendada com conteúdo, tarefa e professor", async ({ page }) => {
    await login(page, student.username);
    await expect(page).toHaveURL(/\/dashboard/);
    const next = page.getByRole("button", { name: /Próxima aula/ });
    await expect(next).toContainText("15:00");
    await expect(next).toContainText(instrument);
    await next.click();

    await expect(page.getByText(lesson.content)).toBeVisible();
    await expect(page.getByText(lesson.homework)).toBeVisible();
    await expect(page.getByText(`Professor: ${teacher.name}`)).toBeVisible();
    await expect(page.getByText("Agendada")).toBeVisible();
  });

  test("aluno não registra prática fora dos limites", async ({ page }) => {
    await login(page, student.username);
    await page.getByRole("button", { name: "Registrar prática" }).first().click();
    const minutes = page.getByRole("textbox", { name: "Tempo de prática em minutos" });
    for (const invalid of ["0", "2000", "abc"]) {
      await minutes.fill(invalid);
      await page.getByRole("button", { name: "Salvar registro" }).click();
      await expect(page.getByText("Informe os minutos praticados (1 a 1440)")).toBeVisible();
    }
    await expect(page).toHaveURL(/practice\/register/);
  });

  test("aluno cria meta semanal e a prática alimenta o progresso", async ({ page }) => {
    await login(page, student.username);
    await page.goto("/goals");
    await page.getByRole("button", { name: "Criar meta" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("radio", { name: "1 h" }).click();
    await dialog.getByRole("button", { name: "Salvar meta" }).click();
    await expect(page.getByText("1 h de prática por semana")).toBeVisible();

    await page.getByRole("tab", { name: "Início" }).click();
    await page.getByRole("button", { name: "Registrar prática" }).first().click();
    await page.getByRole("radio", { name: "30 min" }).click();
    await page.getByRole("textbox", { name: "O que praticou? (opcional)" }).fill(lesson.content);
    await page.getByRole("radio", { name: "Avaliação 4 de 5" }).click();
    await page.getByRole("button", { name: "Salvar registro" }).click();
    await expect(page.getByText("Prática registrada!")).toBeVisible();
    await expect(page.getByText("+30 XP")).toBeVisible();

    await page.goto("/goals");
    await expect(page.getByText("30 min de 1 h")).toBeVisible();
  });

  test("professor recebe notificação da prática e vê o registro", async ({ page }) => {
    await login(page, teacher.username);
    const bell = page.getByRole("button", { name: /Notificações, 1 não lida/ });
    await expect(bell).toBeVisible();
    await bell.click();
    const item = page.getByRole("button", { name: new RegExp(`${student.name} praticou 30 min`) });
    await expect(item).toBeVisible();
    await item.click();

    await expect(page.getByText(lesson.content)).toBeVisible();
    await expect(page.getByRole("img", { name: "Avaliação 4 de 5, selecionada" }).first()).toBeVisible();
  });

  test("observação compartilhada chega ao aluno; anotação privada não", async ({ page, browser }) => {
    await login(page, teacher.username);
    await page.goto("/teacher/students");
    await page.getByText(student.name).first().click();
    await expect(page).toHaveURL(/teacher\/student\//);

    await page.getByRole("button", { name: "Escrever observação para o aluno" }).click();
    await page.getByRole("dialog").getByRole("textbox").fill(notes.shared);
    await page.getByRole("dialog").getByRole("button", { name: "Salvar" }).click();
    await expect(page.getByText(notes.shared)).toBeVisible();

    await page.getByRole("button", { name: "Escrever anotações do professor" }).click();
    await page.getByRole("dialog").getByRole("textbox").fill(notes.privateNote);
    await page.getByRole("dialog").getByRole("button", { name: "Salvar" }).click();
    await expect(page.getByText(notes.privateNote)).toBeVisible();

    const studentPage = await (await browser.newContext()).newPage();
    await login(studentPage, student.username);
    await studentPage.goto("/teacher-notes");
    await expect(studentPage.getByText(notes.shared)).toBeVisible();
    await expect(studentPage.getByText(notes.privateNote)).toHaveCount(0);
  });

  test("material com conteúdo que não bate com a extensão é recusado", async ({ page }) => {
    await login(page, teacher.username);
    await page.goto("/teacher/students");
    await page.getByText(student.name).first().click();
    await page.getByRole("tab", { name: "Materiais" }).click();

    const send = async (name: string, content: string) => {
      await page.getByRole("textbox", { name: "Título do material" }).fill(name);
      const chooser = page.waitForEvent("filechooser");
      await page.getByRole("button", { name: /Escolher arquivo|Trocar arquivo/ }).click();
      await (await chooser).setFiles({ name, mimeType: "application/pdf", buffer: Buffer.from(content) });
      await page.getByRole("button", { name: "Enviar material" }).click();
    };

    await send("disfarcado.pdf", "MZ executável disfarçado");
    await expect(page.getByText(/Escolha um PDF, imagem, áudio, vídeo ou partitura/)).toBeVisible();
    await send("partitura.pdf", "%PDF-1.4 partitura");
    await expect(page.getByText("partitura.pdf", { exact: false })).toBeVisible();
    await expect(page.getByText("disfarcado.pdf", { exact: false })).toHaveCount(0);
  });

  test("aluno não acessa telas do professor", async ({ page }) => {
    await login(page, student.username);
    for (const path of ["/teacher/dashboard", "/teacher/new-lesson", "/teacher/students"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/dashboard$/);
      await expect(page.getByLabel("Painel do professor")).toHaveCount(0);
    }
  });

  test("sessão continua após recarregar e o logout volta ao login", async ({ page }) => {
    await login(page, student.username);
    await page.reload();
    await expect(page).toHaveURL(/\/dashboard/);

    page.on("dialog", (dialog) => dialog.accept());
    await page.getByRole("tab", { name: "Mais" }).click();
    await page.getByRole("button", { name: /Sair/ }).click();
    await expect(page).toHaveURL(/login/);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/login/);
  });
});
