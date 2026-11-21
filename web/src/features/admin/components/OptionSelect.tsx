import { useId, useState } from "react";
import { Field, Input, Select } from "@/components/ui";
import { matches } from "../format";

export function OptionSelect({ label, value, options, onChange, placeholder = "Selecione…", disabled = false, searchLabel }: {
  label: string;
  value: string;
  options: { id: string; label: string }[];
  onChange: (id: string) => void;
  placeholder?: string;
  disabled?: boolean;
  searchLabel?: string;
}) {
  const [query, setQuery] = useState("");
  const labelId = useId();
  const shown = options.filter((option) => option.id === value || matches(option.label, query));
  const select = (
    <Select value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled}
      aria-labelledby={searchLabel ? labelId : undefined} className={searchLabel ? "min-w-0 flex-1" : undefined}>
      <option value="">{placeholder}</option>
      {shown.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
    </Select>
  );
  if (!searchLabel) return <Field label={label}>{select}</Field>;
  return (
    <div>
      <span id={labelId} className="block text-sm font-medium text-ink">{label}</span>
      <div className="mt-1 flex gap-2">
        <div className="w-36 shrink-0">
          <Input type="search" aria-label={searchLabel} placeholder={searchLabel} autoComplete="off" spellCheck={false}
            disabled={disabled} value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
        {select}
      </div>
    </div>
  );
}
