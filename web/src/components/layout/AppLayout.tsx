import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "@/features/auth/useAuth";
import { Button } from "@/components/ui";

const nav = [
  { to: "/admin/users", label: "Usuários" },
  { to: "/admin/roles", label: "Roles" },
  { to: "/admin/permissions", label: "Permissões" },
  { to: "/admin/registrations", label: "Cadastros" },
  { to: "/admin/finance", label: "Financeiro" },
  { to: "/admin/settings", label: "Configurações" },
];

export default function AppLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 flex-col border-r border-gray-200 bg-white p-4">
        <div className="mb-8 px-2">
          <p className="text-lg font-bold text-gray-900">Harmonia</p>
          <p className="text-xs text-gray-400">Admin</p>
        </div>
        <nav className="flex-1 space-y-1">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                `block rounded-lg px-3 py-2 text-sm ${
                  isActive ? "bg-primary text-white" : "text-gray-700 hover:bg-gray-100"
                }`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-gray-200 pt-3">
          <p className="mb-2 px-2 text-xs text-gray-500">{user?.username}</p>
          <Button variant="danger" className="w-full" onClick={logout}>
            Sair
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto bg-gray-50 p-8">
        <Outlet />
      </main>
    </div>
  );
}
