import { useState } from "react";

// Quick actions on the overview link to `?novo` so the page opens with its create form showing.
export function useCreateDrawer() {
  const [open, setOpen] = useState(() => new URLSearchParams(window.location.search).has("novo"));
  const hide = () => {
    setOpen(false);
    if (window.location.search.includes("novo")) window.history.replaceState(null, "", window.location.pathname);
  };
  return { open, show: () => setOpen(true), hide };
}
