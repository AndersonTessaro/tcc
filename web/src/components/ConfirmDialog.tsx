import { useEffect, useId, useRef } from "react";
import { Button } from "./ui";

export type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel: string;
  tone?: "danger" | "primary";
};

export function ConfirmDialog({ title, message, confirmLabel, tone = "danger", onClose }: ConfirmOptions & {
  onClose: (confirmed: boolean) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const messageId = useId();

  useEffect(() => {
    dialog.current?.showModal();
    // "Voltar" comes first in the DOM: the safe choice gets focus.
    dialog.current?.querySelector("button")?.focus();
  }, []);

  return (
    <dialog ref={dialog} role="alertdialog" aria-labelledby={titleId} aria-describedby={messageId}
      onCancel={(event) => { event.preventDefault(); onClose(false); }}
      onClick={(event) => { if (event.target === dialog.current) onClose(false); }}
      className="dialog-in w-[calc(100%-2rem)] max-w-md rounded-xl border border-line bg-white p-0 text-left shadow-2xl
        backdrop:bg-ink/30">
      <div className="px-6 pb-4 pt-6">
        <h2 id={titleId} className="text-lg font-bold text-ink">{title}</h2>
        <p id={messageId} className="mt-2 text-sm leading-relaxed text-ink-muted">{message}</p>
      </div>
      <div className="flex flex-col-reverse gap-2 border-t border-line px-6 py-4 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={() => onClose(false)}>Voltar</Button>
        <Button variant={tone} onClick={() => onClose(true)}>{confirmLabel}</Button>
      </div>
    </dialog>
  );
}
