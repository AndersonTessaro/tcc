import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { toast } from "sonner";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const school = { id: "school-1", name: "Escola Harmonia", active: true, createdAt: "2026-11-01T10:00:00" };
const teacher = { id: "teacher-1", name: "Carlos", username: "carlos", instruments: [{ id: "piano", name: "Piano" }] };
const enrollment = { id: "enrollment-1", student: { id: "student-1", name: "Ana", username: "ana" },
  teacher, instrument: teacher.instruments[0], classLabel: "Piano", status: "ACTIVE", monthlyFee: null };
const lesson = { id: "lesson-1", enrollmentId: enrollment.id, studentId: "student-1", studentName: "Ana",
  teacherName: "Carlos", instrument: "Piano", date: "2030-04-01", startTime: "09:00:00", endTime: "10:00:00",
  status: "SCHEDULED", content: "Escalas", homework: "Praticar", notes: null, attendance: null, fromSchedule: false };
let role: string;
let schools: typeof school[];
let lessons: typeof lesson[];
let conflict: boolean;
let loadError: boolean;
let fetchMock: ReturnType<typeof vi.fn>;

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });
const renderApp = async (path: string) => {
  window.history.pushState({}, "", path);
  const { default: App } = await import("@/App");
  return render(<App />);
};
const requests = (path: string, method = "POST") => fetchMock.mock.calls.filter(([url, init]) =>
  new URL(String(url), "http://localhost").pathname === path && init?.method === method);
const bodyOf = (path: string, method = "POST") => JSON.parse(requests(path, method)[0][1].body);
const fillUser = () => {
  for (const [label, value] of [["Nome", "Beatriz"], ["Usuário", "bia"], ["E-mail", "bia@example.com"], ["Senha", "Senha@123"]]) {
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  }
};
const selectTeacher = async () => {
  await screen.findByRole("option", { name: teacher.name });
  fireEvent.change(screen.getByLabelText("Professor"), { target: { value: teacher.id } });
};
const openLessonForm = async () => {
  await renderApp("/admin/agenda");
  await selectTeacher();
  fireEvent.change(screen.getByLabelText("Semana de"), { target: { value: "2030-04-03" } });
  await screen.findByText("Escalas");
  fireEvent.click(screen.getByRole("button", { name: "Nova aula" }));
  fireEvent.change(screen.getByLabelText("Matrícula"), { target: { value: enrollment.id } });
  fireEvent.change(screen.getByLabelText("Data"), { target: { value: "2030-04-02" } });
  fireEvent.change(screen.getByLabelText("Início"), { target: { value: "14:00" } });
  fireEvent.change(screen.getByLabelText("Fim"), { target: { value: "15:00" } });
  fireEvent.change(screen.getByLabelText("Conteúdo"), { target: { value: "Acordes" } });
  fireEvent.change(screen.getByLabelText("Tarefa"), { target: { value: "Revisar" } });
};

describe("schools, school access and agenda through HTTP", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem("harmonia_access", "token");
    role = "ADMIN";
    schools = [school, { ...school, id: "inactive", name: "Escola inativa", active: false }];
    lessons = [lesson, { ...lesson, id: "lesson-2", date: "2030-04-07", content: "Ritmo" }];
    conflict = false;
    loadError = false;
    fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input), "http://localhost");
      const path = url.pathname;
      const method = init?.method ?? "GET";
      const body = init?.body ? JSON.parse(String(init.body)) : {};
      if (path === "/auth/me" || path === "/auth/login") return json(200, { accessToken: "token", username: "usuario",
        authorities: [`ROLE_${role}`, "auth.user.manage", "enrollment.manage", "lesson.manage"] });
      if (path === "/admin/schools" && method === "POST") {
        const created = { ...school, id: "new-school", name: body.name };
        schools.push(created);
        return json(200, created);
      }
      if (path === "/admin/schools") return json(200, schools);
      if (path === `/admin/schools/${school.id}` && method === "PUT") {
        schools = schools.map((item) => item.id === school.id ? { ...item, ...body } : item);
        return json(200, schools[0]);
      }
      if (path.endsWith("/managers") || (method === "POST" && ["/admin/students", "/admin/teachers"].includes(path))) {
        return json(200, { id: "new-user" });
      }
      if (path === "/admin/teachers") return json(200, [teacher, { ...teacher, id: "teacher-2", name: "Marina" }]);
      if (path === "/admin/students") return json(200, [enrollment.student]);
      if (path === "/admin/instruments") return json(200, teacher.instruments);
      if (path === "/admin/enrollments") return json(200, [enrollment,
        { ...enrollment, id: "other-enrollment", teacher: { ...teacher, id: "teacher-2" }, student: { ...enrollment.student, name: "Bruno" } }]);
      if (path === "/admin/finance/balance") return json(200, { balance: 0 });
      if (path === "/admin/finance/transactions") return json(200, method === "POST" ? { id: "transaction", ...body } : [
        { id: "transaction-1", schoolId: school.id, type: "INCOME", amount: 50, description: "Mensalidade", category: null, date: "2026-11-01" },
        { id: "transaction-2", schoolId: "inactive", type: "EXPENSE", amount: 10, description: "Aluguel", category: null, date: "2026-11-01" },
      ]);
      if (path === "/admin/lessons") return loadError ? json(403, { code: "ACCESS_DENIED" }) : json(200, lessons);
      if (path === "/teacher/lessons/availability") return json(200, { initialStatus: "SCHEDULED", available: true,
        busy: [], conflicts: [], fulfilledSchedule: null });
      if (path === "/teacher/lessons" && method === "POST") return conflict
        ? json(409, { code: "SCHEDULE_CONFLICT", message: "Conflicting slot" }) : json(200, { ...lesson, ...body });
      if (path === "/teacher/lessons/lesson-1" && method === "GET") return json(200, { lesson: lessons[0], attachments: [] });
      if (path === "/teacher/lessons/lesson-1") return json(200, { ...lessons[0], ...body });
      if (path.endsWith("/attendance")) return json(200, { id: "attendance-1", lessonId: lesson.id, ...body, registeredAt: "2026-11-01T12:00:00" });
      if (path.endsWith("/status")) return json(200, { ...lesson, ...body });
      return json(404, {});
    });
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it("shows the system administration links to ADMIN", async () => {
    await renderApp("/");
    for (const name of ["Escolas", "Perfis de acesso", "Permissões", "Configurações", "Agenda"]) {
      expect(await screen.findByRole("link", { name })).toBeInTheDocument();
    }
  }, 15_000);

  it.each(["roles", "permissions", "settings", "schools"])("redirects MANAGER away from %s and hides system links", async (page) => {
    role = "MANAGER";
    await renderApp(`/admin/${page}`);
    expect(await screen.findByRole("heading", { name: "Visão geral" })).toBeInTheDocument();
    for (const name of ["Escolas", "Perfis de acesso", "Permissões", "Configurações"]) {
      expect(screen.queryByRole("link", { name })).toBeNull();
    }
    expect(screen.getByRole("link", { name: "Agenda" })).toBeInTheDocument();
    expect(window.location.pathname).toBe("/admin/overview");
  });

  it.each(["/", "/admin/agenda", "/login"])("blocks TEACHER with a shared permission at %s", async (path) => {
    role = "TEACHER";
    if (path === "/login") localStorage.clear();
    await renderApp(path);
    if (path === "/login") {
      fireEvent.change(await screen.findByPlaceholderText("E-mail ou usuário"), { target: { value: "teacher" } });
      fireEvent.change(screen.getByPlaceholderText("Senha"), { target: { value: "Senha@123" } });
      fireEvent.submit(screen.getByRole("button", { name: "Entrar" }).closest("form")!);
    }
    expect(await screen.findByText(/exclusivo para administradores e gestores/)).toBeInTheDocument();
    expect(screen.queryByRole("navigation")).toBeNull();
  });

  it("keeps instruments read-only for MANAGER", async () => {
    role = "MANAGER";
    await renderApp("/admin/instruments");
    expect(await screen.findByText("Piano")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Criar instrumento" })).toBeNull();
    expect(screen.queryByLabelText("Nome do instrumento")).toBeNull();
  });

  it("creates a school and a manager with the exact bodies", async () => {
    await renderApp("/admin/schools");
    await screen.findByText(school.name);
    fireEvent.click(screen.getAllByRole("button", { name: "Nova escola" })[0]);
    fireEvent.change(screen.getByLabelText("Nome da escola"), { target: { value: "Escola Sonetto" } });
    fireEvent.click(screen.getByRole("button", { name: "Criar escola" }));
    await screen.findByText("Escola Sonetto");
    expect(bodyOf("/admin/schools")).toEqual({ name: "Escola Sonetto" });
    fireEvent.click(screen.getByRole("button", { name: `Criar gestor de ${school.name}` }));
    fillUser();
    fireEvent.click(screen.getByRole("button", { name: "Cadastrar gestor" }));
    await waitFor(() => expect(requests(`/admin/schools/${school.id}/managers`)).toHaveLength(1));
    expect(bodyOf(`/admin/schools/${school.id}/managers`)).toEqual({ name: "Beatriz", username: "bia", email: "bia@example.com", password: "Senha@123" });
  });

  it("renames and deactivates a school after confirmation", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
    await renderApp("/admin/schools");
    fireEvent.click(await screen.findByRole("button", { name: `Editar ${school.name}` }));
    fireEvent.change(screen.getByLabelText("Nome da escola"), { target: { value: "Sonetto" } });
    fireEvent.click(screen.getByLabelText("Escola ativa"));
    fireEvent.click(screen.getByRole("button", { name: "Salvar escola" }));
    expect(requests(`/admin/schools/${school.id}`, "PUT")).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "Salvar escola" }));
    await waitFor(() => expect(requests(`/admin/schools/${school.id}`, "PUT")).toHaveLength(1));
    expect(confirm).toHaveBeenCalled();
    expect(bodyOf(`/admin/schools/${school.id}`, "PUT")).toEqual({ name: "Sonetto", active: false });
  });

  it.each(["ADMIN", "MANAGER"])("registers a student with role-aware school selection for %s", async (selectedRole) => {
    role = selectedRole;
    await renderApp("/admin/students?novo");
    await screen.findByText("Ana");
    fillUser();
    if (role === "ADMIN") {
      await screen.findByRole("option", { name: school.name });
      expect(screen.queryByRole("option", { name: "Escola inativa" })).toBeNull();
      fireEvent.submit(screen.getByRole("button", { name: "Cadastrar aluno" }).closest("form")!);
      expect(requests("/admin/students")).toHaveLength(0);
      expect(toast.error).toHaveBeenCalledWith("Selecione uma escola");
      fireEvent.change(screen.getByLabelText("Escola"), { target: { value: school.id } });
    } else {
      expect(screen.queryByLabelText("Escola")).toBeNull();
      expect(requests("/admin/schools", "GET")).toHaveLength(0);
    }
    fireEvent.click(screen.getByRole("button", { name: "Cadastrar aluno" }));
    await waitFor(() => expect(requests("/admin/students")).toHaveLength(1));
    expect(bodyOf("/admin/students")).toEqual({ name: "Beatriz", username: "bia", email: "bia@example.com", password: "Senha@123",
      ...(role === "ADMIN" ? { schoolId: school.id } : {}) });
  });

  it.each(["ADMIN", "MANAGER"])("registers a teacher for %s with the school contract", async (selectedRole) => {
    role = selectedRole;
    await renderApp("/admin/teachers?novo");
    await screen.findByText("Carlos");
    fillUser();
    fireEvent.click(screen.getByLabelText("Piano"));
    if (role === "ADMIN") {
      await screen.findByRole("option", { name: school.name });
      fireEvent.change(screen.getByLabelText("Escola"), { target: { value: school.id } });
    } else expect(screen.queryByLabelText("Escola")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Cadastrar professor" }));
    await waitFor(() => expect(requests("/admin/teachers")).toHaveLength(1));
    expect(bodyOf("/admin/teachers")).toEqual({ name: "Beatriz", username: "bia", email: "bia@example.com", password: "Senha@123",
      instrumentIds: ["piano"], ...(role === "ADMIN" ? { schoolId: school.id } : {}) });
  });

  it.each(["ADMIN", "MANAGER"])("registers a finance transaction for %s with the school contract", async (selectedRole) => {
    role = selectedRole;
    await renderApp("/admin/finance?novo");
    await screen.findByText("Mensalidade");
    fireEvent.change(screen.getByLabelText("Valor"), { target: { value: "99" } });
    if (role === "ADMIN") {
      await screen.findAllByRole("option", { name: school.name });
      fireEvent.submit(screen.getByRole("button", { name: "Lançar" }).closest("form")!);
      expect(requests("/admin/finance/transactions")).toHaveLength(0);
      expect(toast.error).toHaveBeenCalledWith("Selecione uma escola");
      fireEvent.change(screen.getByLabelText("Escola"), { target: { value: school.id } });
    } else expect(screen.queryByLabelText("Escola")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Lançar" }));
    await waitFor(() => expect(requests("/admin/finance/transactions")).toHaveLength(1));
    expect(bodyOf("/admin/finance/transactions")).toEqual(expect.objectContaining({ amount: 99, type: "INCOME" }));
    expect(bodyOf("/admin/finance/transactions").schoolId).toBe(role === "ADMIN" ? school.id : undefined);
  });

  it("filters finance by school including inactive schools", async () => {
    await renderApp("/admin/finance");
    await screen.findByText("Aluguel");
    fireEvent.change(await screen.findByLabelText("Filtrar por escola"), { target: { value: "inactive" } });
    expect(screen.queryByText("Mensalidade")).toBeNull();
    expect(screen.getByText("Aluguel")).toBeInTheDocument();
    expect(screen.getAllByText("Escola inativa").length).toBeGreaterThan(0);
  });

  it("groups the selected teacher's lessons Monday through Sunday and navigates weeks", async () => {
    await openLessonForm();
    fireEvent.click(screen.getByRole("button", { name: "Fechar painel" }));
    expect(within(screen.getByRole("region", { name: "Segunda-feira, 01/04/2030" })).getByText("Escalas")).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Domingo, 07/04/2030" })).getByText("Ritmo")).toBeInTheDocument();
    const url = new URL(String(requests("/admin/lessons", "GET").at(-1)![0]), "http://localhost");
    expect(Object.fromEntries(url.searchParams)).toEqual({ teacherId: teacher.id, from: "2030-04-01", to: "2030-04-07" });
    fireEvent.click(screen.getByRole("button", { name: "Próxima semana" }));
    await waitFor(() => expect(screen.getByLabelText("Semana de")).toHaveValue("2030-04-08"));
    fireEvent.click(screen.getByRole("button", { name: "Semana anterior" }));
    expect(screen.getByLabelText("Semana de")).toHaveValue("2030-04-01");
  });

  it.each(["ADMIN", "MANAGER"])("creates a lesson for %s using only the selected teacher's enrollments", async (selectedRole) => {
    role = selectedRole;
    await openLessonForm();
    expect(within(screen.getByLabelText("Matrícula")).queryByRole("option", { name: /Bruno/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Criar aula" }));
    await waitFor(() => expect(requests("/teacher/lessons")).toHaveLength(1));
    expect(bodyOf("/teacher/lessons")).toEqual({ enrollmentId: enrollment.id, date: "2030-04-02", startTime: "14:00", endTime: "15:00",
      content: "Acordes", homework: "Revisar" });
  });

  it("translates schedule conflicts from HTTP 409 and preserves the form", async () => {
    conflict = true;
    await openLessonForm();
    fireEvent.click(screen.getByRole("button", { name: "Criar aula" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Conflito de horário com outra aula ou horário fixo"));
    expect(screen.getByLabelText("Conteúdo")).toHaveValue("Acordes");
  });

  it("checks availability with the exact slot parameters", async () => {
    await openLessonForm();
    fireEvent.click(screen.getByRole("button", { name: "Verificar disponibilidade" }));
    expect(await screen.findByText("Horário disponível")).toBeInTheDocument();
    const url = new URL(String(requests("/teacher/lessons/availability", "GET")[0][0]), "http://localhost");
    expect(Object.fromEntries(url.searchParams)).toEqual({ enrollmentId: enrollment.id, date: "2030-04-02", startTime: "14:00", endTime: "15:00" });
  });

  it("edits completed lesson content while locking date and time", async () => {
    lessons = [{ ...lesson, status: "DONE" }];
    await openLessonForm();
    fireEvent.click(screen.getByRole("button", { name: "Fechar painel" }));
    fireEvent.click(screen.getByRole("button", { name: "Editar aula de Ana em 01/04/2030" }));
    expect(await screen.findByLabelText("Data")).toBeDisabled();
    expect(screen.getByLabelText("Início")).toBeDisabled();
    expect(screen.getByLabelText("Fim")).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Conteúdo"), { target: { value: "Revisão" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar aula" }));
    await waitFor(() => expect(requests("/teacher/lessons/lesson-1", "PUT")).toHaveLength(1));
    expect(bodyOf("/teacher/lessons/lesson-1", "PUT")).toEqual({ date: lesson.date, startTime: lesson.startTime, endTime: lesson.endTime,
      content: "Revisão", homework: lesson.homework });
  });

  it("changes status only after confirmation", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
    await openLessonForm();
    fireEvent.click(screen.getByRole("button", { name: "Fechar painel" }));
    const cancel = within(screen.getByRole("region", { name: "Segunda-feira, 01/04/2030" })).getByRole("button", { name: "Cancelar" });
    fireEvent.click(cancel);
    expect(requests("/teacher/lessons/lesson-1/status", "PATCH")).toHaveLength(0);
    fireEvent.click(cancel);
    await waitFor(() => expect(requests("/teacher/lessons/lesson-1/status", "PATCH")).toHaveLength(1));
    expect(bodyOf("/teacher/lessons/lesson-1/status", "PATCH")).toEqual({ status: "CANCELED" });
    expect(confirm).toHaveBeenCalledTimes(2);
  });

  it("registers excused attendance for a past lesson", async () => {
    lessons = [{ ...lesson, date: "2020-04-06", status: "DONE" }];
    await renderApp("/admin/agenda");
    await selectTeacher();
    fireEvent.change(screen.getByLabelText("Semana de"), { target: { value: "2020-04-06" } });
    await screen.findByText("Escalas");
    fireEvent.click(screen.getByRole("button", { name: "Registrar frequência de Ana em 06/04/2020" }));
    fireEvent.change(screen.getByLabelText("Frequência"), { target: { value: "EXCUSED" } });
    fireEvent.change(screen.getByLabelText("Justificativa"), { target: { value: "Atestado" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar frequência" }));
    await waitFor(() => expect(requests("/teacher/lessons/lesson-1/attendance")).toHaveLength(1));
    expect(bodyOf("/teacher/lessons/lesson-1/attendance")).toEqual({ status: "EXCUSED", justification: "Atestado" });
  });

  it("shows translated agenda load errors", async () => {
    loadError = true;
    await renderApp("/admin/agenda");
    await selectTeacher();
    expect(await screen.findByRole("alert")).toHaveTextContent("Sem permissão para esta ação");
  });
});
