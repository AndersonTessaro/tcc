import { expect, test, type APIRequestContext, type Locator, type Page } from "@playwright/test";

const API = process.env.E2E_API_URL ?? "http://localhost:8080";
const ADMIN = { login: process.env.E2E_ADMIN_LOGIN ?? "admin", password: process.env.E2E_ADMIN_PASSWORD ?? "Admin@123" };
const PASSWORD = "Senha@123";

const run = `v${Date.now().toString(36)}`;
const school = `Escola ${run}`;
const manager = { name: `Gestora ${run}`, username: `gestora${run}`, email: `gestora${run}@e2e.test` };
const teacher = { name: `Prof ${run}`, username: `prof${run}`, email: `prof${run}@e2e.test` };
const student = { name: `Aluno ${run}`, username: `aluno${run}`, email: `aluno${run}@e2e.test` };
const instrument = `Flauta ${run}`;
const practiced = `Escala cromática ${run}`;
// Smallest buffer the backend accepts as MP4: an ftyp box at offset 4.
const video = Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from("ftypmp42"), Buffer.alloc(2048, 1)]);

function isoDate(daysFromToday: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function token(request: APIRequestContext, login: string, password: string): Promise<string> {
  const res = await request.post(`${API}/auth/login`, { data: { login, password } });
  expect(res.ok(), `login ${login} — backend no ar?`).toBeTruthy();
  return (await res.json()).accessToken;
}

async function post(request: APIRequestContext, path: string, bearer: string, data: object): Promise<{ id: string }> {
  const res = await request.post(`${API}${path}`, { data, headers: { Authorization: `Bearer ${bearer}` } });
  expect(res.ok(), `${path} -> ${res.status()} ${await res.text()}`).toBeTruthy();
  return res.json();
}

async function login(page: Page, user: string) {
  await page.goto("/login");
  await page.getByRole("textbox", { name: "E-mail ou usuário" }).fill(user);
  await page.getByRole("textbox", { name: "Senha" }).fill(PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).not.toHaveURL(/login/);
}

// Position inside the scrolled form, so elements below the fold still compare correctly.
async function offsetTop(locator: Locator): Promise<number> {
  return locator.evaluate((el) => {
    let scrolled = 0;
    for (let node = el.parentElement; node; node = node.parentElement) scrolled += node.scrollTop;
    return el.getBoundingClientRect().top + scrolled;
  });
}

test.describe.serial("Escola do gestor: professor cadastra aluno, agenda aula e recebe vídeo da prática", () => {
  test.beforeAll(async ({ request }) => {
    const admin = await token(request, ADMIN.login, ADMIN.password);
    const { id: instrumentId } = await post(request, "/admin/instruments", admin, { name: instrument });
    const { id: schoolId } = await post(request, "/admin/schools", admin, { name: school });
    await post(request, `/admin/schools/${schoolId}/managers`, admin, { ...manager, password: PASSWORD });
    const gestora = await token(request, manager.username, PASSWORD);
    await post(request, "/admin/teachers", gestora, { ...teacher, password: PASSWORD, instrumentIds: [instrumentId] });
  });

  test("professor cadastra aluno pelo app, com validação dos campos", async ({ page }) => {
    await login(page, teacher.username);
    await page.getByRole("tab", { name: "Alunos" }).click();
    await page.getByRole("button", { name: "Novo aluno" }).click();

    await page.getByRole("button", { name: "Cadastrar aluno" }).click();
    await expect(page.getByText("Informe o nome.")).toBeVisible();
    await expect(page.getByText("A senha precisa de 8 a 72 caracteres.")).toBeVisible();

    await page.getByRole("textbox", { name: "Nome", exact: true }).fill(student.name);
    await page.getByRole("textbox", { name: "E-mail" }).fill(student.email);
    await page.getByRole("textbox", { name: "Usuário (login)" }).fill(student.username);
    await page.getByRole("textbox", { name: "Senha inicial" }).fill(PASSWORD);
    await page.getByRole("button", { name: "Cadastrar aluno" }).click();

    await expect(page.getByText("Aluno cadastrado.")).toBeVisible();
    await expect(page).toHaveURL(/teacher\/student\//);
    await expect(page.getByText(student.name)).toBeVisible();
  });

  test("aluno cadastrado pelo professor fica na escola do gestor", async ({ request }) => {
    const gestora = await token(request, manager.username, PASSWORD);
    const res = await request.get(`${API}/admin/students`, { headers: { Authorization: `Bearer ${gestora}` } });
    const names = (await res.json()).map((s: { name: string }) => s.name);
    expect(names).toEqual([student.name]);
  });

  test("formulário de aula segue a ordem Aluno → Quando → Situação → Conteúdo → Anexos", async ({ page }) => {
    await login(page, teacher.username);
    await page.goto("/teacher/new-lesson");
    await page.getByRole("radio", { name: new RegExp(student.name) }).click();

    const sections = [
      page.getByRole("radio", { name: new RegExp(student.name) }),
      page.getByRole("heading", { name: "Quando" }),
      page.getByRole("heading", { name: "Situação da aula" }),
      page.getByRole("textbox", { name: "Conteúdo trabalhado" }),
      page.getByRole("heading", { name: "Anexos" }),
      page.getByRole("button", { name: /Salvar aula|Agendar aula/ }),
    ];
    const positions: number[] = [];
    for (const section of sections) positions.push(await offsetTop(section));
    expect(positions).toEqual([...positions].sort((a, b) => a - b));

    await page.getByRole("textbox", { name: "Data" }).fill(isoDate(1));
    await page.getByRole("textbox", { name: "Início" }).fill("16:00");
    await expect(page.getByText(/a aula nasce agendada/)).toBeVisible();
    await page.getByRole("textbox", { name: "Conteúdo trabalhado" }).fill(practiced);
    await page.getByRole("button", { name: /Agendar aula/ }).click();

    await expect(page.getByText("Aula agendada", { exact: true })).toBeVisible();
    await expect(page).not.toHaveURL(/new-lesson/);
  });

  test("tela aberta direto volta para o início pelo botão Voltar", async ({ page }) => {
    await login(page, teacher.username);
    await page.goto("/teacher/new-lesson");
    await page.getByRole("button", { name: "Voltar" }).click();
    await expect(page).toHaveURL(/teacher\/dashboard/);
  });

  test("aluno registra prática com vídeo escolhido da galeria", async ({ page }) => {
    await login(page, student.username);
    await page.getByRole("button", { name: "Registrar prática" }).first().click();
    await expect(page.getByText("Vídeo até 150 MB · áudio até 50 MB.")).toBeVisible();

    const chooser = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Vídeo da galeria" }).click();
    await (await chooser).setFiles({ name: "pratica.mp4", mimeType: "video/mp4", buffer: video });
    await expect(page.getByText(/pratica\.mp4/)).toBeVisible();

    await page.getByRole("textbox", { name: "O que praticou? (opcional)" }).fill(practiced);
    await page.getByRole("radio", { name: "Avaliação 5 de 5" }).click();
    const upload = page.waitForResponse((res) => /\/me\/practices\/[^/]+\/recording$/.test(res.url()) && res.request().method() !== "GET");
    await page.getByRole("button", { name: "Salvar registro" }).click();
    expect((await upload).ok()).toBeTruthy();
    await expect(page.getByText("Prática registrada!")).toBeVisible();
  });

  test("professor abre a notificação e baixa o vídeo do aluno", async ({ page }) => {
    await login(page, teacher.username);
    await page.getByRole("button", { name: /Notificações, 1 não lida/ }).click();
    await page.getByRole("button", { name: new RegExp(`${student.name} praticou 30 min`) }).click();

    await expect(page.getByText(practiced)).toBeVisible();
    const attachment = page.getByText(/pratica\.mp4/);
    await expect(attachment).toBeVisible();
    const download = page.waitForResponse((res) => /\/teacher\/practices\/[^/]+\/recording$/.test(res.url()));
    await attachment.click();
    const res = await download;
    expect(res.status()).toBe(200);
    expect((await res.body()).length).toBe(video.length);
  });
});
