import { useEffect, useRef, useState } from "react";
import { validateDate, validateTimeRange } from "./lessonForm";
import { teacherService, type LessonAvailability } from "./teacherService";

const DEBOUNCE_MS = 300;

type SlotQuery = { enrollmentId: string; date: string; startTime: string; endTime: string };

export type SlotAvailabilityState = {
  data: LessonAvailability | null;
  checking: boolean;
  error: unknown;
  checkedFor: string | null;
};

export const slotKey = ({ enrollmentId, date, startTime, endTime }: SlotQuery) => `${enrollmentId}|${date}|${startTime}|${endTime}`;

export function useSlotAvailability(query: SlotQuery): SlotAvailabilityState {
  const [state, setState] = useState<SlotAvailabilityState>({ data: null, checking: false, error: null, checkedFor: null });
  const requestRef = useRef(0);
  const { enrollmentId, date, startTime, endTime } = query;

  useEffect(() => {
    const request = ++requestRef.current;
    if (!enrollmentId || validateDate(date)) {
      setState({ data: null, checking: false, error: null, checkedFor: null });
      return;
    }
    const timesValid = !validateTimeRange(startTime, endTime);
    const key = slotKey({ enrollmentId, date, startTime, endTime });
    setState((current) => ({ ...current, checking: true, error: null }));
    const timer = setTimeout(() => {
      teacherService
        .availability(enrollmentId, date, timesValid ? startTime : undefined, timesValid ? endTime : undefined)
        .then((data) => {
          if (request === requestRef.current) setState({ data, checking: false, error: null, checkedFor: timesValid ? key : null });
        })
        .catch((error: unknown) => {
          if (request === requestRef.current) setState((current) => ({ ...current, checking: false, error, checkedFor: null }));
        });
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [enrollmentId, date, startTime, endTime]);

  return state;
}
