import { cloneElement, useEffect, useId, useRef } from "react";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactElement, ReactNode, SelectHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const BUTTON_STYLES: Record<ButtonVariant, string> = {
  primary: "bg-primary text-white hover:bg-primary-strong",
  secondary: "border border-line bg-white text-ink hover:border-ink-faint",
  ghost: "text-ink-muted hover:bg-primary-soft hover:text-primary-strong",
  danger: "bg-danger-soft text-danger hover:bg-danger hover:text-white",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: "sm" | "md" }) {
  const sizing = size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm";
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition-colors
        focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary
        disabled:cursor-not-allowed disabled:opacity-50 ${sizing} ${BUTTON_STYLES[variant]} ${className}`}
      {...props}
    />
  );
}

const FIELD = `w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-faint
  focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-soft disabled:bg-canvas`;

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${FIELD} ${className}`} {...props} />;
}

export function Select({ className = "", ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`${FIELD} ${className}`} {...props} />;
}

export function Field({ label, hint, children, className = "" }: {
  label: string;
  hint?: string;
  children: ReactElement<{ "aria-describedby"?: string }>;
  className?: string;
}) {
  const hintId = useId();
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-ink">
        {label}
        <span className="mt-1 block font-normal">
          {hint ? cloneElement(children, { "aria-describedby": hintId }) : children}
        </span>
      </label>
      {hint && <p id={hintId} className="mt-1 text-xs text-ink-faint">{hint}</p>}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-line bg-white ${className}`}>{children}</div>;
}

export function PageHeader({ title, description, count, actions }: {
  title: string;
  description?: string;
  count?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">
          {title}
          {count && <span className="ml-3 align-middle text-sm font-semibold text-ink-faint">{count}</span>}
        </h1>
        {description && <p className="mt-1 max-w-prose text-sm text-ink-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

type Tone = "neutral" | "brand" | "success" | "warning" | "danger";

const BADGE_TONES: Record<Tone, string> = {
  neutral: "bg-canvas text-ink-muted",
  brand: "bg-primary-soft text-primary-strong",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${BADGE_TONES[tone]}`}>
      {children}
    </span>
  );
}

export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-end gap-3 border-b border-line p-4">{children}</div>;
}

export function Segmented<T extends string>({ label, value, options, onChange }: {
  label: string;
  value: T;
  options: { id: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex max-w-full overflow-x-auto rounded-lg bg-canvas p-1">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          aria-pressed={option.id === value}
          onClick={() => onChange(option.id)}
          className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-colors focus-visible:outline
            focus-visible:outline-2 focus-visible:outline-primary ${option.id === value
              ? "bg-white text-ink shadow-sm" : "text-ink-muted hover:text-ink"}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function Table({ columns, children }: { columns: { label: string; align?: "right" }[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-line text-xs font-semibold text-ink-faint">
            {columns.map((column) => (
              <th key={column.label} scope="col"
                className={`whitespace-nowrap px-4 py-3 ${column.align === "right" ? "text-right" : ""}`}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  );
}

export const cell = "px-4 py-3 align-middle";

export function Drawer({ open, title, description, onClose, children }: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  const titleId = useId();

  useEffect(() => {
    close.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const first = panel.current?.querySelector<HTMLElement>("[data-drawer-body] :is(input, select, textarea, button)");
    first?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close.current();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-ink/30" aria-hidden="true" onClick={() => close.current()} />
      <div ref={panel} role="dialog" aria-modal="true" aria-labelledby={titleId}
        className="drawer-in relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
          <div>
            <h2 id={titleId} className="text-lg font-bold text-ink">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-ink-muted">{description}</p>}
          </div>
          <button type="button" aria-label="Fechar painel" onClick={() => close.current()}
            className="rounded-md p-1 text-ink-faint hover:bg-canvas hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
            <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div data-drawer-body className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
