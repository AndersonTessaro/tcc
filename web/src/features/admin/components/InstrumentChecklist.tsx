import type { InstrumentOption } from "../adminService";

type Props = {
  instruments: InstrumentOption[];
  selected: string[];
  onChange: (ids: string[]) => void;
};

export function InstrumentChecklist({ instruments, selected, onChange }: Props) {
  if (instruments.length === 0) {
    return <p className="text-sm text-ink-muted">Cadastre um instrumento primeiro.</p>;
  }
  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);

  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-ink">Instrumentos que ensina</legend>
      <div className="flex flex-wrap gap-2">
        {instruments.map((i) => {
          const checked = selected.includes(i.id);
          return (
            <label key={i.id} className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm font-medium transition-colors
              has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary ${checked
                ? "border-primary bg-primary-soft text-primary-strong" : "border-line text-ink-muted hover:border-ink-faint"}`}>
              <input type="checkbox" className="sr-only" checked={checked} onChange={() => toggle(i.id)} />
              {i.name}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
