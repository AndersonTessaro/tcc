import { useState } from "react";
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
  const shown = options.filter((option) => option.id === value || matches(option.label, query));
  return (
    <div className="space-y-1">
      {searchLabel && <Input type="search" aria-label={searchLabel} placeholder={searchLabel} autoComplete="off"
        spellCheck={false} disabled={disabled} value={query} onChange={(event) => setQuery(event.target.value)} />}
      <Field label={label}>
        <Select value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled}>
          <option value="">{placeholder}</option>
          {shown.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
        </Select>
      </Field>
    </div>
  );
}
