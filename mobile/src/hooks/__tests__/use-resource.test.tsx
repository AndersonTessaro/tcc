import { act, renderHook, waitFor } from "@testing-library/react-native";
import { useResource } from "@/hooks/use-resource";

const mockToast = jest.fn();
jest.mock("@/ui/Toast", () => ({ useToast: () => ({ show: mockToast }) }));
beforeEach(() => jest.clearAllMocks());

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

it.each([
  [new TypeError("Failed to fetch"), "Sem conexão com o servidor"],
  [new Error("failure"), "Não foi possível atualizar."],
])("preserves existing data and shows a toast when refresh fails", async (cause, message) => {
  const fetcher = jest.fn().mockResolvedValueOnce(["lesson"]).mockRejectedValueOnce(cause);
  const { result } = await renderHook(() => useResource(fetcher));
  await waitFor(() => expect(result.current.data).toEqual(["lesson"]));
  await act(() => result.current.refresh());
  expect(result.current.data).toEqual(["lesson"]);
  expect(result.current.error).toBeNull();
  expect(result.current.refreshing).toBe(false);
  expect(mockToast).toHaveBeenCalledWith(message, "error");
});

it("keeps refresh failures as screen errors when there is no data", async () => {
  const cause = new TypeError("offline");
  const fetcher = jest.fn().mockRejectedValue(cause);
  const { result } = await renderHook(() => useResource(fetcher));
  await waitFor(() => expect(result.current.loading).toBe(false));
  await act(() => result.current.refresh());
  expect(result.current.data).toBeUndefined();
  expect(result.current.error).toBe(cause);
  expect(mockToast).not.toHaveBeenCalled();
});

it("reloads an empty (204) resource in the background without a spinner or error screen", async () => {
  let finish!: () => void;
  const fetcher = jest.fn()
    .mockResolvedValueOnce(undefined)
    .mockReturnValueOnce(new Promise<undefined>((resolve) => { finish = () => resolve(undefined); }))
    .mockRejectedValueOnce(new TypeError("offline"));
  const { result } = await renderHook(() => useResource(fetcher));
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(result.current.loading).toBe(false));
  let pending: Promise<void> = Promise.resolve();
  await act(async () => { pending = result.current.reload(); });
  expect(result.current.loading).toBe(false);
  await act(async () => { finish(); await pending; });
  await act(() => result.current.reload());
  expect(result.current.error).toBeNull();
});
