export function OptionSelect({ label, value, options, onChange, placeholder = "Selecione…", disabled = false }: {
  label: string;
  value: string;
  options: { id: string; label: string }[];
  onChange: (id: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <label className="block text-sm text-gray-700">
      {label}
      <select className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
        value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled}>
        <option value="">{placeholder}</option>
        {options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
      </select>
    </label>
  );
}
