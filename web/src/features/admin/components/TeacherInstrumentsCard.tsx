import { useState } from "react";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/http/errorMessage";
import { adminService } from "../adminService";
import type { InstrumentOption, TeacherOption } from "../adminService";
import { Button, Card } from "@/components/ui";
import { InstrumentChecklist } from "./InstrumentChecklist";

type Props = {
  teachers: TeacherOption[];
  instruments: InstrumentOption[];
  onSaved: () => Promise<void>;
};

export function TeacherInstrumentsCard({ teachers, instruments, onSaved }: Props) {
  const [teacherId, setTeacherId] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const pickTeacher = (id: string) => {
    setTeacherId(id);
    setSelected(teachers.find((t) => t.id === id)?.instruments.map((i) => i.id) ?? []);
  };

  const save = async () => {
    if (!teacherId) {
      toast.error("Selecione o professor");
      return;
    }
    try {
      await adminService.setTeacherInstruments(teacherId, selected);
      toast.success("Instrumentos do professor atualizados");
      await onSaved();
    } catch (error) {
      toast.error(apiErrorMessage(error, "Erro ao salvar instrumentos"));
    }
  };

  return (
    <Card>
      <p className="mb-3 font-medium">Instrumentos do professor</p>
      <div className="space-y-2">
        <label className="block text-sm text-gray-700">
          Professor do vínculo
          <select
            aria-label="Professor do vínculo"
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-primary"
            value={teacherId}
            onChange={(e) => pickTeacher(e.target.value)}
          >
            <option value="">Selecione…</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.username})
              </option>
            ))}
          </select>
        </label>
        {teacherId ? (
          <InstrumentChecklist instruments={instruments} selected={selected} onChange={setSelected} />
        ) : null}
        <Button onClick={save} className="w-full">
          Salvar instrumentos
        </Button>
      </div>
    </Card>
  );
}
