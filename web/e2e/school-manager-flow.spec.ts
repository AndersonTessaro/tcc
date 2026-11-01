import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const API = process.env.E2E_API_URL ?? "http://localhost:8080";
const ADMIN = { login: process.env.E2E_ADMIN_LOGIN ?? "admin", password: process.env.E2E_ADMIN_PASSWORD ?? "Admin@123" };
const PASSWORD = "Senha@123";

const run = `w${Date.now().toString(36)}`;
const schoolA = `Escola A ${run}`;
const schoolB = `Escola B ${run}`;
const managerA = { name: `Gestora ${run}`, username: `gestora${run}`, email: `gestora${run}@e2e.test` };
const managerB = { name: `Gestor B ${run}`, username: `gestorb${run}`, email: `gestorb${run}@e2e.test` };
const teacher = { name: `Prof ${run}`, username: `prof${run}`, email: `prof${run}@e2e.test` };
const student = { name: `Aluna ${run}`, username: `aluna${run}`, email: `aluna${run}@e2e.test` };
const instrument = `Cello ${run}`;

function isoDate(daysFromToday: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function brDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

async function adminToken(request: APIRequestContext): Promise<string> {
  const auth = await request.post(`${API}/auth/login`, { data: ADMIN });
  expect(auth.ok(), "admin login — backend no ar e seed do admin?").toBeTruthy();
  return (await auth.json()).accessToken;
}

async function post(request: APIRequestContext, path: string, token: string, data: object): Promise<{ id: string }> {
  const res = await request.post(`${API}${path}`, { data, headers: { Authorization: `Bearer ${token}` } });
  expect(res.ok(), `${path} -> ${res.status()} ${await res.text()}`).toBeTruthy();
  return res.json();
}

async function login(page: Page, user: string, password = PASSWORD) {
  await page.goto("/login");
  await page.getByRole("textbox", { name: "Usuário ou e-mail" }).fill(user);
  await page.getByRole("textbox", { name: "Senha" }).fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
}

async function loginAs(page: Page, user: string, password = PASSWORD) {
  await login(page, user, password);
  await expect(page).toHaveURL(/admin\/overview/);
}

const menu = (page: Page) => page.getByRole("navigation", { name: "Menu principal" });

test.describe.serial("Painel web: admin do sistema e gestor da escola", () => {
  test.beforeAll(async ({ request }) => {
    const token = await adminToken(request);
    await post(request, "/admin/instruments", token, { name: instrument });
    const { id: schoolBId } = await post(request, "/admin/schools", token, { name: schoolB });
    await post(request, `/admin/schools/${schoolBId}/managers`, token, { ...managerB, password: PASSWORD });
  });

  test("admin do sistema cadastra escola e gestor; usuário repetido é recusado", async ({ page }) => {
    await loginAs(page, ADMIN.login, ADMIN.password);
    await expect(menu(page).getByText("Administração do sistema")).toBeVisible();
    await menu(page).getByRole("link", { name: "Escolas" }).click();

    await page.getByRole("button", { name: "Nova escola" }).click();
    await page.getByRole("textbox", { name: "Nome da escola" }).fill(schoolA);
    await page.getByRole("button", { name: "Criar escola" }).click();
    await expect(page.getByText("Escola cadastrada")).toBeVisible();
    const row = page.getByRole("row", { name: new RegExp(schoolA) });
    await expect(row.getByText("Ativa")).toBeVisible();

    await page.getByRole("button", { name: `Criar gestor de ${schoolA}` }).click();
    const drawer = page.getByRole("dialog");
    await drawer.getByRole("textbox", { name: "Nome" }).fill(managerA.name);
    await drawer.getByRole("textbox", { name: "Usuário" }).fill(managerB.username);
    await drawer.getByRole("textbox", { name: "E-mail" }).fill(managerA.email);
    await drawer.getByRole("textbox", { name: "Senha" }).fill(PASSWORD);
    await drawer.getByRole("button", { name: "Cadastrar gestor" }).click();
    await expect(page.getByText("Já existe um cadastro com esses dados")).toBeVisible();
    await expect(drawer.getByRole("textbox", { name: "Nome" })).toHaveValue(managerA.name);

    await drawer.getByRole("textbox", { name: "Usuário" }).fill(managerA.username);
    await drawer.getByRole("button", { name: "Cadastrar gestor" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("gestor vê só o menu da escola e o nome da escola", async ({ page }) => {
    await loginAs(page, managerA.email);
    await expect(menu(page).getByText(schoolA)).toBeVisible();
    await expect(menu(page).getByText("Gestor da escola")).toBeVisible();
    for (const hidden of ["Escolas", "Perfis de acesso", "Permissões", "Configurações"])
      await expect(menu(page).getByRole("link", { name: hidden })).toHaveCount(0);
    await expect(page.getByRole("term").filter({ hasText: "Alunos" }).locator("+ dd")).toHaveText("0");
  });

  test("gestor cadastra professor, aluno e matrícula", async ({ page }) => {
    await loginAs(page, managerA.username);
    await page.goto("/admin/teachers?novo");
    const teacherForm = page.getByRole("dialog");
    await teacherForm.getByRole("textbox", { name: "Nome", exact: true }).fill(teacher.name);
    await teacherForm.getByRole("textbox", { name: "Usuário" }).fill(teacher.username);
    await teacherForm.getByRole("textbox", { name: "E-mail" }).fill(teacher.email);
    await teacherForm.getByRole("textbox", { name: "Senha" }).fill(PASSWORD);
    await teacherForm.getByText(instrument, { exact: true }).click();
    await teacherForm.getByRole("button", { name: "Cadastrar professor" }).click();
    await expect(page.getByText("Professor cadastrado")).toBeVisible();
    await expect(page.getByRole("row", { name: new RegExp(teacher.name) })).toContainText(instrument);

    await page.goto("/admin/students?novo");
    const studentForm = page.getByRole("dialog");
    await studentForm.getByRole("textbox", { name: "Nome", exact: true }).fill(student.name);
    await studentForm.getByRole("textbox", { name: "Usuário" }).fill(student.username);
    await studentForm.getByRole("textbox", { name: "E-mail" }).fill(student.email);
    await studentForm.getByRole("textbox", { name: "Senha" }).fill(PASSWORD);
    await studentForm.getByRole("button", { name: "Cadastrar aluno" }).click();
    await expect(page.getByRole("row", { name: new RegExp(student.name) })).toBeVisible();

    await page.goto("/admin/enrollments?novo");
    const enrollmentForm = page.getByRole("dialog");
    await expect(enrollmentForm.getByRole("combobox", { name: "Aluno" }).getByRole("option")).toHaveCount(2);
    await enrollmentForm.getByRole("combobox", { name: "Aluno" }).selectOption({ label: `${student.name} (${student.username})` });
    await enrollmentForm.getByRole("combobox", { name: "Professor" }).selectOption({ label: `${teacher.name} (${teacher.username})` });
    await enrollmentForm.getByRole("combobox", { name: "Instrumento" }).selectOption({ label: instrument });
    await enrollmentForm.getByRole("spinbutton", { name: "Mensalidade (opcional)" }).fill("180");
    await enrollmentForm.getByRole("button", { name: "Criar matrícula" }).click();
    await expect(page.getByText("Matrícula criada")).toBeVisible();
    await expect(page.getByRole("row", { name: new RegExp(student.name) })).toContainText("R$ 180,00");
  });

  test("gestor agenda aula; a agenda vai para a semana da aula e acusa conflito", async ({ page }) => {
    const lessonDate = isoDate(8);
    await loginAs(page, managerA.username);
    await menu(page).getByRole("link", { name: "Agenda" }).click();
    await expect(page.getByRole("combobox", { name: "Professor" })).toHaveValue(/.+/);

    await page.getByRole("button", { name: "Nova aula" }).click();
    const form = page.getByRole("dialog");
    await expect(form.getByRole("textbox", { name: "Data" })).toHaveValue(isoDate(0));
    await form.getByRole("combobox", { name: "Matrícula" }).selectOption({ label: `${student.name} — ${instrument}` });
    await form.getByRole("textbox", { name: "Data" }).fill(lessonDate);
    await form.getByRole("textbox", { name: "Início" }).fill("09:00");
    await expect(form.getByRole("textbox", { name: "Fim" })).toHaveValue("10:00");
    await form.getByRole("textbox", { name: "Conteúdo" }).fill(`Arco longo ${run}`);
    await form.getByRole("button", { name: "Verificar disponibilidade" }).click();
    await expect(form.getByRole("status")).toHaveText("Horário disponível");
    await form.getByRole("button", { name: "Criar aula" }).click();

    await expect(page.getByText("Aula criada")).toBeVisible();
    const day = page.getByRole("region", { name: new RegExp(brDate(lessonDate)) });
    await expect(day).toContainText("09:00–10:00");
    await expect(day).toContainText(student.name);
    await expect(day).toContainText("Agendada");

    await page.getByRole("button", { name: "Nova aula" }).click();
    await form.getByRole("combobox", { name: "Matrícula" }).selectOption({ label: `${student.name} — ${instrument}` });
    await form.getByRole("textbox", { name: "Data" }).fill(lessonDate);
    await form.getByRole("textbox", { name: "Início" }).fill("09:30");
    await form.getByRole("button", { name: "Verificar disponibilidade" }).click();
    await expect(form.getByRole("status")).toHaveText("Conflito de horário com outra aula ou horário fixo");
  });

  test("gestor de outra escola não enxerga os dados da escola A", async ({ page }) => {
    await loginAs(page, managerB.username);
    await expect(menu(page).getByText(schoolB)).toBeVisible();
    for (const [path, name] of [["/admin/students", student.name], ["/admin/teachers", teacher.name], ["/admin/enrollments", student.name]]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.getByText(name)).toHaveCount(0);
    }
    await page.goto("/admin/agenda");
    await expect(page.getByText("Nenhum professor encontrado")).toBeVisible();
  });

  test("escola desativada pelo admin bloqueia o login do gestor", async ({ page }) => {
    await loginAs(page, ADMIN.login, ADMIN.password);
    await menu(page).getByRole("link", { name: "Escolas" }).click();
    await page.getByRole("button", { name: `Editar ${schoolA}` }).click();
    page.once("dialog", (dialog) => {
      expect(dialog.message()).toContain("não conseguirão mais entrar");
      void dialog.accept();
    });
    await page.getByRole("dialog").getByText("Escola ativa").click();
    await page.getByRole("dialog").getByRole("button", { name: /Salvar/ }).click();
    await expect(page.getByRole("row", { name: new RegExp(schoolA) }).getByText("Inativa")).toBeVisible();
    await expect(page.getByRole("button", { name: `Criar gestor de ${schoolA}` })).toBeDisabled();

    await menu(page).getByRole("button", { name: "Sair" }).click();
    await login(page, managerA.username);
    await expect(page.getByText("Login ou senha inválidos")).toBeVisible();
    await expect(page).toHaveURL(/login/);
  });
});
