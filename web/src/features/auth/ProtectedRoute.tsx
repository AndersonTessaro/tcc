import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./useAuth";

export function ProtectedRoute({ children, anyOf, redirectTo = "/" }: { children: ReactNode; anyOf?: string[]; redirectTo?: string }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-8 text-ink-faint">Carregando...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (anyOf && !anyOf.some((a) => user.authorities.includes(a))) return <Navigate to={redirectTo} replace />;
  return <>{children}</>;
}
