import { useState } from "react";
import { ApiError } from "@/lib/http/apiError";
import type { InstrumentOption, NewUser } from "../adminService";
import { useSchoolOptions } from "../useSchoolOptions";
import { SchoolSelect } from "./SchoolSelect";
import { UserForm } from "./UserForm";

export function SchoolUserForm({ label, instruments, onSubmit, onDone }: {
  label: string; instruments?: InstrumentOption[];
  onSubmit: (user: NewUser, instrumentIds: string[]) => Promise<unknown>; onDone: () => void;
}) {
  const schools = useSchoolOptions();
  const [schoolId, setSchoolId] = useState("");
  const submit = (user: NewUser, instrumentIds: string[]) => {
    if (schools.required && !schools.data.some((school) => school.active && school.id === schoolId)) {
      throw new ApiError(422, "DOMAIN_VALIDATION", "School is required for system administrator");
    }
    return onSubmit({ ...user, ...(schools.required ? { schoolId } : {}) }, instrumentIds);
  };
  return (
    <div className="space-y-4">
      {schools.required && <SchoolSelect schools={schools.data} loading={schools.loading} error={schools.error}
        value={schoolId} onChange={setSchoolId} />}
      <UserForm label={label} instruments={instruments} onSubmit={submit} onDone={onDone} />
    </div>
  );
}
