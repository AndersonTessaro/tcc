import { useAuth } from "@/features/auth/useAuth";
import { isSystemAdmin } from "./accessProfile";

export function useAdminAccess() {
  const { user } = useAuth();
  return { isAdmin: isSystemAdmin(user?.authorities ?? []) };
}
