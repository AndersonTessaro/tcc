import { useAuth } from "@/features/auth/useAuth";
import { isSystemAdmin } from "./accessProfile";

export function useAdminAccess() {
  const authorities = useAuth().user?.authorities ?? [];
  return { isAdmin: isSystemAdmin(authorities), isManager: authorities.includes("ROLE_MANAGER") };
}
