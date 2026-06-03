import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/features/auth/useAuth";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import AppLayout from "@/components/layout/AppLayout";
import Login from "@/features/auth/pages/Login";
import Forgot from "@/features/auth/pages/Forgot";
import Users from "@/features/admin/pages/Users";
import Roles from "@/features/admin/pages/Roles";
import Permissions from "@/features/admin/pages/Permissions";
import Registrations from "@/features/admin/pages/Registrations";
import Settings from "@/features/admin/pages/Settings";
import { Button } from "@/components/ui";

const ADMIN_AUTHORITIES = ["ROLE_ADMIN", "auth.user.manage", "auth.role.manage"];

function Home() {
  const { user, loading, logout } = useAuth();
  if (loading) return <div className="p-8 text-gray-500">Carregando...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.authorities.some((a) => ADMIN_AUTHORITIES.includes(a)))
    return <Navigate to="/admin/users" replace />;
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="text-gray-600">
        Este configurador web é exclusivo para administradores. Use o app mobile para o acesso de
        aluno/professor.
      </p>
      <Button variant="danger" onClick={logout}>
        Sair
      </Button>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/forgot" element={<Forgot />} />
          <Route path="/" element={<Home />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute anyOf={ADMIN_AUTHORITIES}>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/admin/users" replace />} />
            <Route path="users" element={<Users />} />
            <Route path="roles" element={<Roles />} />
            <Route path="permissions" element={<Permissions />} />
            <Route path="registrations" element={<Registrations />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
