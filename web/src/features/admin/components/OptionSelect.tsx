import { Field, Select } from "@/components/ui";

export function OptionSelect({ label, value, options, onChange, placeholder = "Selecione…", disabled = false }: {
  label: string;
  value: string;
  options: { id: string; label: string }[];
  onChange: (id: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <Field label={label}>
      <Select value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled}>
        <option value="">{placeholder}</option>
        {options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
      </Select>
    </Field>
  );
}
