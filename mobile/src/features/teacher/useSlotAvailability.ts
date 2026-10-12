import { useEffect, useRef, useState } from "react";
import { validateDate, validateTimeRange } from "./lessonForm";
import { teacherService, type LessonAvailability } from "./teacherService";

const DEBOUNCE_MS = 300;

type SlotQuery = { enrollmentId: string; date: string; startTime: string; endTime: string };

export type SlotAvailabilityState = {
  data: LessonAvailability | undefined;
  checking: boolean;
  error: unknown;
  checkedFor: string | null;
};

export const slotKey = ({ enrollmentId, date, startTime, endTime }: SlotQuery) => `${enrollmentId}|${date}|${startTime}|${endTime}`;

export function useSlotAvailability(query: SlotQuery): SlotAvailabilityState {
  const [state, setState] = useState<SlotAvailabilityState>({ data: undefined, checking: false, error: null, checkedFor: null });
  const requestRef = useRef(0);
  const { enrollmentId, date, startTime, endTime } = query;
  const key = slotKey(query);
  const validQuery = !!enrollmentId && !validateDate(date);

  useEffect(() => {
    const request = ++requestRef.current;
    if (!enrollmentId || validateDate(date)) {
      setState({ data: undefined, checking: false, error: null, checkedFor: null });
      return;
    }
    const timesValid = !validateTimeRange(startTime, endTime);
    setState({ data: undefined, checking: true, error: null, checkedFor: key });
    const timer = setTimeout(() => {
      teacherService
        .availability(enrollmentId, date, timesValid ? startTime : undefined, timesValid ? endTime : undefined)
        .then((data) => {
          if (request === requestRef.current) setState({ data, checking: false, error: null, checkedFor: key });
        })
        .catch((error: unknown) => {
          if (request === requestRef.current) setState({ data: undefined, checking: false, error, checkedFor: key });
        });
    }, DEBOUNCE_MS);
    return () => { clearTimeout(timer); requestRef.current++; };
  }, [enrollmentId, date, startTime, endTime, key]);

  return state.checkedFor === key
    ? state
    : { data: undefined, checking: validQuery, error: null, checkedFor: null };
}
