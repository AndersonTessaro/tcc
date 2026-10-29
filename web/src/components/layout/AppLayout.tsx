import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "@/features/auth/useAuth";

const NAV_GROUPS = [
  { title: "Escola", items: [
    { to: "/admin/overview", label: "Visão geral" },
    { to: "/admin/students", label: "Alunos" },
    { to: "/admin/teachers", label: "Professores" },
    { to: "/admin/enrollments", label: "Matrículas" },
    { to: "/admin/instruments", label: "Instrumentos" },
  ] },
  { title: "Dinheiro", items: [{ to: "/admin/finance", label: "Financeiro" }] },
  { title: "Acesso", items: [
    { to: "/admin/users", label: "Usuários" },
    { to: "/admin/roles", label: "Perfis de acesso" },
    { to: "/admin/permissions", label: "Permissões" },
  ] },
  { title: "Sistema", items: [{ to: "/admin/settings", label: "Configurações" }] },
];

function Wordmark() {
  return (
    <div className="px-3 pt-2">
      <div className="relative py-1">
        <svg className="absolute inset-0 h-full w-full text-primary/25" aria-hidden="true"
          preserveAspectRatio="none" viewBox="0 0 100 36">
          {[1, 9.5, 18, 26.5, 35].map((y) => <line key={y} x1="0" x2="100" y1={y} y2={y} stroke="currentColor" strokeWidth="0.6" vectorEffect="non-scaling-stroke" />)}
        </svg>
        <p className="relative text-xl font-extrabold tracking-tight text-ink">Harmonia</p>
      </div>
      <p className="mt-2 text-xs font-medium text-ink-muted">Administração da escola</p>
    </div>
  );
}

export default function AppLayout() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const sidebar = (
    <nav aria-label="Menu principal" className="flex h-full flex-col gap-6 p-4">
      <Wordmark />
      <div className="flex-1 space-y-5 overflow-y-auto">
        {NAV_GROUPS.map((group) => (
          <div key={group.title}>
            <p className="mb-1 px-3 text-xs font-semibold text-ink-faint">{group.title}</p>
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.to}>
                  <NavLink to={item.to} onClick={() => setMenuOpen(false)}
                    className={({ isActive }) => `block rounded-lg px-3 py-2 text-sm font-semibold transition-colors
                      focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${isActive
                        ? "bg-primary-soft text-primary-strong" : "text-ink-muted hover:bg-canvas hover:text-ink"}`}>
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-line px-3 pt-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">{user?.username}</p>
          <p className="text-xs text-ink-faint">Administrador</p>
        </div>
        <button type="button" onClick={logout}
          className="rounded-lg px-3 py-1.5 text-sm font-semibold text-danger hover:bg-danger-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
          Sair
        </button>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen bg-canvas md:flex">
      <div className="flex items-center justify-between border-b border-line bg-white px-4 py-3 md:hidden">
        <p className="text-lg font-extrabold text-ink">Harmonia</p>
        <button type="button" aria-expanded={menuOpen} aria-controls="admin-menu" onClick={() => setMenuOpen(!menuOpen)}
          className="rounded-lg border border-line px-3 py-1.5 text-sm font-semibold text-ink">
          {menuOpen ? "Fechar menu" : "Menu"}
        </button>
      </div>
      <aside id="admin-menu"
        className={`${menuOpen ? "block" : "hidden"} border-b border-line bg-white md:sticky md:top-0 md:block md:h-screen md:w-64 md:shrink-0 md:border-b-0 md:border-r`}>
        {sidebar}
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 md:px-10 md:py-8">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
