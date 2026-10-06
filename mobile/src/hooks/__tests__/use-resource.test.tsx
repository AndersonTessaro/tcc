import { act, renderHook, waitFor } from "@testing-library/react-native";
import { useResource } from "@/hooks/use-resource";

describe("useResource", () => {
  it("keeps the previous data visible while refreshing", async () => {
    let value = 1;
    const fetcher = jest.fn(() => Promise.resolve(value));
    const { result } = await renderHook(() => useResource(fetcher));

    await waitFor(() => expect(result.current.data).toBe(1));
    value = 2;
    let pending: Promise<void> = Promise.resolve();
    await act(async () => { pending = result.current.reload(); });
    expect(result.current.loading).toBe(false);
    await act(() => pending);
    expect(result.current.data).toBe(2);
  });

  it("ignores a stale response that resolves after a newer one", async () => {
    const resolvers: ((value: string) => void)[] = [];
    const fetcher = jest.fn(() => new Promise<string>((resolve) => resolvers.push(resolve)));
    const { result } = await renderHook(() => useResource(fetcher));

    await act(async () => { void result.current.refresh(); });
    await act(async () => { resolvers[1]("new"); });
    await act(async () => { resolvers[0]("old"); });
    expect(result.current.data).toBe("new");
  });

  it("surfaces the error only when there is nothing to show", async () => {
    const fetcher = jest.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce("ok").mockRejectedValueOnce(new Error("offline"));
    const { result } = await renderHook(() => useResource(fetcher));

    await waitFor(() => expect(result.current.error).toBeInstanceOf(Error));
    await act(() => result.current.reload());
    expect(result.current.data).toBe("ok");
    await act(() => result.current.reload());
    expect(result.current.error).toBeNull();
    expect(result.current.data).toBe("ok");
  });
});
