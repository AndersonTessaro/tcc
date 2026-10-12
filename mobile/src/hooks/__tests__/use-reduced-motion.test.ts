import { act, renderHook, waitFor } from "@testing-library/react-native";
import { AccessibilityInfo } from "react-native";
import { useReducedMotion } from "../use-reduced-motion";

afterEach(() => jest.restoreAllMocks());

it.each([true, false])("reads the platform reduced-motion preference: %s", async (enabled) => {
  jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(enabled);
  const { result } = await renderHook(useReducedMotion);
  await waitFor(() => expect(result.current).toBe(enabled));
});

it("responds to preference changes and removes the listener", async () => {
  let onChange!: (enabled: boolean) => void;
  const remove = jest.fn();
  jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(false);
  jest.spyOn(AccessibilityInfo, "addEventListener").mockImplementation((_event, listener) => {
    onChange = listener as (enabled: boolean) => void;
    return { remove };
  });
  const { result, unmount } = await renderHook(useReducedMotion);
  await waitFor(() => expect(result.current).toBe(false));
  await act(() => { onChange(true); });
  expect(result.current).toBe(true);
  await unmount();
  expect(remove).toHaveBeenCalled();
});
