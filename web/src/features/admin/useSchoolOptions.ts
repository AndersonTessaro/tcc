import { useCallback } from "react";
import { adminService } from "./adminService";
import { useAdminList } from "./hooks/useAdminList";
import { useAdminAccess } from "./useAdminAccess";

export function useSchoolOptions(enabled = true) {
  const { isAdmin } = useAdminAccess();
  const required = isAdmin && enabled;
  const load = useCallback(() => required ? adminService.schools() : Promise.resolve([]), [required]);
  const state = useAdminList(load, [], "Erro ao carregar escolas");
  return { ...state, required };
}
