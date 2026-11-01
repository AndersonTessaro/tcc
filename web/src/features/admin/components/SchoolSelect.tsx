import type { SchoolDto } from "../adminService";
import { ListState } from "./ListState";
import { OptionSelect } from "./OptionSelect";

export function SchoolSelect({ schools, loading, error, value, onChange }: {
  schools: SchoolDto[]; loading: boolean; error: string; value: string; onChange: (value: string) => void;
}) {
  const active = schools.filter((school) => school.active);
  return (
    <div className="space-y-2">
      <OptionSelect label="Escola" value={value} onChange={onChange} disabled={loading || !!error}
        options={active.map((school) => ({ id: school.id, label: school.name }))} />
      <ListState loading={loading} error={error} empty={!active.length} emptyMessage="Nenhuma escola ativa. Cadastre ou ative uma escola para continuar." />
    </div>
  );
}
