import { act, renderHook, waitFor } from "@testing-library/react-native";
import { useSlotAvailability } from "../useSlotAvailability";
import { teacherService, type LessonAvailability } from "../teacherService";

jest.mock("../teacherService", () => ({ teacherService: { availability: jest.fn() } }));
const availability = teacherService.availability as jest.MockedFunction<typeof teacherService.availability>;
const query = { enrollmentId: "e1", date: "2026-10-01", startTime: "10:00", endTime: "11:00" };
const free: LessonAvailability = { available: true, initialStatus: "DONE", busy: [], conflicts: [], fulfilledSchedule: null };

beforeEach(() => { jest.clearAllMocks(); });

it("hides the previous query data immediately and clears it on failure", async () => {
  availability.mockResolvedValueOnce(free).mockRejectedValueOnce(new Error("offline"));
  const { result, rerender } = await renderHook((value) => useSlotAvailability(value), { initialProps: query });
  await waitFor(() => expect(result.current.data).toBe(free));
  await rerender({ ...query, enrollmentId: "e2", date: "2026-10-02" });
  expect(result.current.data).toBeUndefined();
  expect(result.current.checking).toBe(true);
  await waitFor(() => expect(result.current.error).toEqual(new Error("offline")));
  expect(result.current.data).toBeUndefined();
  expect(result.current.checking).toBe(false);
});

it("ignores a previous query response while checking a new slot", async () => {
  let resolveOld!: (value: LessonAvailability) => void;
  availability.mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; }))
    .mockResolvedValueOnce({ ...free, initialStatus: "SCHEDULED" });
  const { result, rerender } = await renderHook((value) => useSlotAvailability(value), { initialProps: query });
  await waitFor(() => expect(availability).toHaveBeenCalledTimes(1));
  await rerender({ ...query, date: "2099-01-01" });
  await act(() => { resolveOld(free); });
  expect(result.current.data).toBeUndefined();
  await waitFor(() => expect(result.current.data?.initialStatus).toBe("SCHEDULED"));
});
