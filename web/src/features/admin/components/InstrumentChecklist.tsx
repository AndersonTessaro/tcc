import type { InstrumentOption } from "../adminService";

type Props = {
  instruments: InstrumentOption[];
  selected: string[];
  onChange: (ids: string[]) => void;
};

export function InstrumentChecklist({ instruments, selected, onChange }: Props) {
  if (instruments.length === 0) {
    return <p className="text-sm text-gray-500">Cadastre um instrumento primeiro.</p>;
  }
  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);

  return (
    <fieldset className="flex flex-wrap gap-3 text-sm">
      <legend className="mb-1 text-gray-700">Instrumentos que ensina</legend>
      {instruments.map((i) => (
        <label key={i.id} className="flex items-center gap-1">
          <input type="checkbox" checked={selected.includes(i.id)} onChange={() => toggle(i.id)} />
          {i.name}
        </label>
      ))}
    </fieldset>
  );
}
