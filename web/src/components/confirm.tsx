import { createRoot } from "react-dom/client";
import { ConfirmDialog, type ConfirmOptions } from "./ConfirmDialog";

export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
  const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const host = document.body.appendChild(document.createElement("div"));
  const root = createRoot(host);
  return new Promise((resolve) => {
    const close = (confirmed: boolean) => {
      root.unmount();
      host.remove();
      previous?.focus();
      resolve(confirmed);
    };
    root.render(<ConfirmDialog {...options} onClose={close} />);
  });
}
