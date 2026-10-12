import { act, renderHook } from "@testing-library/react-native";
import { useUnsavedChangesGuard } from "../use-unsaved-changes-guard";
import { confirm } from "@/lib/confirm";

type RemoveEvent = { preventDefault: () => void; data: { action: { type: string } } };
let mockListener: (event: RemoveEvent) => void;
const mockUnsubscribe = jest.fn();
const mockNavigation = {
  addListener: jest.fn((_name: string, listener: typeof mockListener) => { mockListener = listener; return mockUnsubscribe; }),
  setOptions: jest.fn(),
  dispatch: jest.fn(),
};
jest.mock("expo-router", () => ({ useNavigation: () => mockNavigation }));
jest.mock("@/lib/confirm", () => ({ confirm: jest.fn() }));
const confirmation = confirm as jest.MockedFunction<typeof confirm>;
const action = { type: "GO_BACK" };
const remove = () => ({ preventDefault: jest.fn(), data: { action } });

beforeEach(() => { jest.clearAllMocks(); confirmation.mockResolvedValue(false); });

it("confirms navigation removal and dispatches only after consent", async () => {
  await renderHook(() => useUnsavedChangesGuard(true));
  const event = remove();
  await act(() => { mockListener(event); });
  expect(event.preventDefault).toHaveBeenCalled();
  expect(mockNavigation.dispatch).not.toHaveBeenCalled();
  expect(mockNavigation.setOptions).toHaveBeenCalledWith({ gestureEnabled: false });
  confirmation.mockResolvedValue(true);
  await act(() => { mockListener(remove()); });
  expect(mockNavigation.dispatch).toHaveBeenCalledWith(action);
});

it("allows clean drafts and skips the guard immediately after saving", async () => {
  const { result, rerender, unmount } = await renderHook(({ dirty }) => useUnsavedChangesGuard(dirty), { initialProps: { dirty: false } });
  const cleanEvent = remove();
  await act(() => { mockListener(cleanEvent); });
  expect(cleanEvent.preventDefault).not.toHaveBeenCalled();
  await rerender({ dirty: true });
  result.current();
  const savedEvent = remove();
  await act(() => { mockListener(savedEvent); });
  expect(savedEvent.preventDefault).not.toHaveBeenCalled();
  expect(confirmation).not.toHaveBeenCalled();
  await unmount();
  expect(mockUnsubscribe).toHaveBeenCalled();
});

it("guards a new draft after the previous schedule draft was reset", async () => {
  const { rerender } = await renderHook(({ dirty }) => useUnsavedChangesGuard(dirty), { initialProps: { dirty: true } });
  await rerender({ dirty: false });
  await rerender({ dirty: true });
  const event = remove();
  await act(() => { mockListener(event); });
  expect(event.preventDefault).toHaveBeenCalled();
  expect(confirmation).toHaveBeenCalledTimes(1);
});
