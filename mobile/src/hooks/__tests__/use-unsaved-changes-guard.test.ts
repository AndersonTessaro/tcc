import { Platform } from "react-native";
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


it("protects browser unload only while dirty and removes the listener after save", async () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const browser = { addEventListener: jest.fn(), removeEventListener: jest.fn() };
  const platform = jest.replaceProperty(Platform, "OS", "web");
  Object.defineProperty(globalThis, "window", { configurable: true, value: browser });
  try {
    const { result, rerender, unmount } = await renderHook(({ dirty }) => useUnsavedChangesGuard(dirty), { initialProps: { dirty: false } });
    expect(browser.addEventListener).not.toHaveBeenCalled();
    await rerender({ dirty: true });
    const listener = browser.addEventListener.mock.calls[0][1] as (event: { preventDefault: () => void; returnValue: string | undefined }) => void;
    expect(browser.addEventListener).toHaveBeenCalledWith("beforeunload", listener);
    const dirtyEvent = { preventDefault: jest.fn(), returnValue: undefined as string | undefined };
    listener(dirtyEvent);
    expect(dirtyEvent.preventDefault).toHaveBeenCalled();
    expect(dirtyEvent.returnValue).toBe("");
    await rerender({ dirty: false });
    expect(browser.removeEventListener).toHaveBeenCalledWith("beforeunload", listener);
    await rerender({ dirty: true });
    const nextListener = browser.addEventListener.mock.calls[1][1] as typeof listener;
    result.current();
    expect(browser.removeEventListener).toHaveBeenLastCalledWith("beforeunload", nextListener);
    const savedEvent = { preventDefault: jest.fn(), returnValue: undefined };
    nextListener(savedEvent);
    expect(savedEvent.preventDefault).not.toHaveBeenCalled();
    await unmount();
  } finally {
    platform.restore();
    if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
    else Reflect.deleteProperty(globalThis, "window");
  }
});

it("removes the browser unload listener when an unsaved form unmounts", async () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const browser = { addEventListener: jest.fn(), removeEventListener: jest.fn() };
  const platform = jest.replaceProperty(Platform, "OS", "web");
  Object.defineProperty(globalThis, "window", { configurable: true, value: browser });
  try {
    const { unmount } = await renderHook(() => useUnsavedChangesGuard(true));
    const listener = browser.addEventListener.mock.calls[0][1];
    await unmount();
    expect(browser.removeEventListener).toHaveBeenCalledWith("beforeunload", listener);
  } finally {
    platform.restore();
    if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
    else Reflect.deleteProperty(globalThis, "window");
  }
});
